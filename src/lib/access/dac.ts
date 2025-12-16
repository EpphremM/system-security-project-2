import { prisma } from "@/lib/prisma";

export type PermissionType = "read" | "write" | "execute" | "delete" | "share";


export async function isResourceOwner(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  const resource = await prisma.resource.findUnique({
    where: {
      type_resourceId: {
        type: resourceType,
        resourceId,
      },
    },
    select: {
      ownerId: true,
    },
  });

  return resource?.ownerId === userId;
}


export async function hasPermission(
  userId: string,
  resourceType: string,
  resourceId: string,
  permission: PermissionType
): Promise<{ allowed: boolean; reason?: string; inherited?: boolean }> {
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { legacyRole: true },
  });

  if (user?.legacyRole === "SUPER_ADMIN") {
    return { allowed: true, reason: "SUPER_ADMIN bypass" };
  }

  
  const isOwner = await isResourceOwner(userId, resourceType, resourceId);
  if (isOwner) {
    return { allowed: true };
  }

  
  const resource = await prisma.resource.findUnique({
    where: {
      type_resourceId: {
        type: resourceType,
        resourceId,
      },
    },
    include: {
      sharedPermissions: {
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      },
      parent: {
        include: {
          sharedPermissions: {
            where: {
              userId,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          },
        },
      },
    },
  });

  if (!resource) {
    return { allowed: false, reason: "Resource not found" };
  }

  
  const directPermission = resource.sharedPermissions.find((p) => {
    switch (permission) {
      case "read":
        return p.canRead;
      case "write":
        return p.canWrite;
      case "execute":
        return p.canExecute;
      case "delete":
        return p.canDelete;
      case "share":
        return p.canShare;
      default:
        return false;
    }
  });

  if (directPermission) {
    return { allowed: true, inherited: directPermission.inherited };
  }

  
  if (resource.parent) {
    const inheritedPermission = resource.parent.sharedPermissions.find((p) => {
      switch (permission) {
        case "read":
          return p.canRead;
        case "write":
          return p.canWrite;
        case "execute":
          return p.canExecute;
        case "delete":
          return p.canDelete;
        case "share":
          return p.canShare;
        default:
          return false;
      }
    });

    if (inheritedPermission) {
      return { allowed: true, inherited: true };
    }
  }

  return { allowed: false, reason: "No permission granted" };
}


export async function grantPermission(
  resourceType: string,
  resourceId: string,
  userId: string,
  permissions: {
    read?: boolean;
    write?: boolean;
    execute?: boolean;
    delete?: boolean;
    share?: boolean;
  },
  grantedBy: string,
  expiresAt?: Date,
  reason?: string
) {
  
  const canShare = await hasPermission(grantedBy, resourceType, resourceId, "share");
  if (!canShare.allowed && !(await isResourceOwner(grantedBy, resourceType, resourceId))) {
    throw new Error("You do not have permission to share this resource");
  }

  
  let resource = await prisma.resource.findUnique({
    where: {
      type_resourceId: {
        type: resourceType,
        resourceId,
      },
    },
  });

  if (!resource) {
    
    resource = await prisma.resource.create({
      data: {
        type: resourceType,
        resourceId,
        ownerId: grantedBy,
        securityLabelId: "", 
      },
    });
  }

  
  const existing = await prisma.resourcePermission.findFirst({
    where: {
      resourceId: resource.id,
      userId,
    },
  });

  if (existing) {
    
    return await prisma.resourcePermission.update({
      where: { id: existing.id },
      data: {
        canRead: permissions.read ?? existing.canRead,
        canWrite: permissions.write ?? existing.canWrite,
        canExecute: permissions.execute ?? existing.canExecute,
        canDelete: permissions.delete ?? existing.canDelete,
        canShare: permissions.share ?? existing.canShare,
        expiresAt,
        reason,
        updatedAt: new Date(),
      },
    });
  }

  
  return await prisma.resourcePermission.create({
    data: {
      resourceId: resource.id,
      userId,
      canRead: permissions.read ?? false,
      canWrite: permissions.write ?? false,
      canExecute: permissions.execute ?? false,
      canDelete: permissions.delete ?? false,
      canShare: permissions.share ?? false,
      expiresAt,
      grantedBy,
      reason,
    },
  });
}


export async function revokePermission(
  resourceType: string,
  resourceId: string,
  userId: string,
  revokedBy: string
) {
  
  const canShare = await hasPermission(revokedBy, resourceType, resourceId, "share");
  if (!canShare.allowed && !(await isResourceOwner(revokedBy, resourceType, resourceId))) {
    throw new Error("You do not have permission to revoke access");
  }

  const resource = await prisma.resource.findUnique({
    where: {
      type_resourceId: {
        type: resourceType,
        resourceId,
      },
    },
  });

  if (!resource) {
    throw new Error("Resource not found");
  }

  await prisma.resourcePermission.deleteMany({
    where: {
      resourceId: resource.id,
      userId,
    },
  });

  
  await prisma.auditLog.create({
    data: {
      userId: revokedBy,
      action: "dac.permission_revoked",
      resource: resourceType,
      resourceId,
      securityLabel: "INTERNAL",
      details: {
        targetUserId: userId,
      },
    },
  });
}


export async function requestOwnershipTransfer(
  resourceType: string,
  resourceId: string,
  toUserId: string,
  requestedBy: string,
  reason?: string
) {
  const resource = await prisma.resource.findUnique({
    where: {
      type_resourceId: {
        type: resourceType,
        resourceId,
      },
    },
  });

  if (!resource) {
    throw new Error("Resource not found");
  }

  
  const isOwner = resource.ownerId === requestedBy;
  const canShare = await hasPermission(requestedBy, resourceType, resourceId, "share");

  if (!isOwner && !canShare.allowed) {
    throw new Error("You do not have permission to transfer ownership");
  }

  
  const existing = await prisma.ownershipTransfer.findFirst({
    where: {
      resourceId: resource.id,
      status: "PENDING",
    },
  });

  if (existing) {
    throw new Error("A pending ownership transfer already exists");
  }

  return await prisma.ownershipTransfer.create({
    data: {
      resourceId: resource.id,
      fromUserId: resource.ownerId,
      toUserId,
      requestedBy,
      reason,
      status: "PENDING",
    },
  });
}


export async function approveOwnershipTransfer(
  transferId: string,
  approvedBy: string
) {
  const transfer = await prisma.ownershipTransfer.findUnique({
    where: { id: transferId },
    include: { resource: true },
  });

  if (!transfer) {
    throw new Error("Transfer request not found");
  }

  
  if (transfer.resource.ownerId !== approvedBy) {
    throw new Error("Only the current owner can approve the transfer");
  }

  if (transfer.status !== "PENDING") {
    throw new Error("Transfer is not pending");
  }

  
  await prisma.resource.update({
    where: { id: transfer.resourceId },
    data: {
      ownerId: transfer.toUserId,
    },
  });

  
  const updated = await prisma.ownershipTransfer.update({
    where: { id: transferId },
    data: {
      status: "APPROVED",
      approvedBy,
      approvedAt: new Date(),
      completedAt: new Date(),
    },
  });

  
  await prisma.auditLog.create({
    data: {
      userId: approvedBy,
      action: "dac.ownership_transferred",
      resource: transfer.resource.type,
      resourceId: transfer.resource.resourceId,
      securityLabel: "INTERNAL",
      details: {
        fromUserId: transfer.fromUserId,
        toUserId: transfer.toUserId,
      },
    },
  });

  return updated;
}


export async function rejectOwnershipTransfer(
  transferId: string,
  rejectedBy: string,
  reason?: string
) {
  const transfer = await prisma.ownershipTransfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) {
    throw new Error("Transfer request not found");
  }

  
  const resource = await prisma.resource.findUnique({
    where: { id: transfer.resourceId },
  });

  if (resource?.ownerId !== rejectedBy) {
    throw new Error("Only the current owner can reject the transfer");
  }

  return await prisma.ownershipTransfer.update({
    where: { id: transferId },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
      updatedAt: new Date(),
    },
  });
}


export async function getResourcePermissions(
  resourceType: string,
  resourceId: string
) {
  const resource = await prisma.resource.findUnique({
    where: {
      type_resourceId: {
        type: resourceType,
        resourceId,
      },
    },
    include: {
      sharedPermissions: {
        where: {
          userId: { not: null }, 
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          grantedAt: "desc",
        },
      },
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return resource;
}


export async function inheritPermissions(
  resourceId: string,
  parentResourceId: string
) {
  
  const parentPermissions = await prisma.resourcePermission.findMany({
    where: {
      resourceId: parentResourceId,
      inherited: false, 
    },
  });

  
  const inheritedPermissions = await Promise.all(
    parentPermissions.map((parentPerm) =>
      prisma.resourcePermission.create({
        data: {
          resourceId,
          userId: parentPerm.userId,
          groupId: parentPerm.groupId,
          canRead: parentPerm.canRead,
          canWrite: parentPerm.canWrite,
          canExecute: parentPerm.canExecute,
          canDelete: parentPerm.canDelete,
          canShare: parentPerm.canShare,
          expiresAt: parentPerm.expiresAt,
          grantedBy: parentPerm.grantedBy,
          inherited: true,
          inheritedFrom: parentResourceId,
        },
      })
    )
  );

  return inheritedPermissions;
}

