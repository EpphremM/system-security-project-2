import { prisma } from "@/lib/prisma";

/**
 * Predefined system roles with hierarchy
 */
export const PREDEFINED_ROLES = {
  SUPER_ADMIN: {
    name: "SUPER_ADMIN",
    description: "Full system control and administration",
    level: 100,
    isSystem: true,
  },
  ADMIN: {
    name: "ADMIN",
    description: "User and system management",
    level: 90,
    isSystem: true,
    parent: "SUPER_ADMIN",
  },
  HR_MANAGER: {
    name: "HR_MANAGER",
    description: "Personnel data access and management",
    level: 80,
    isSystem: true,
    parent: "ADMIN",
  },
  DEPARTMENT_HEAD: {
    name: "DEPARTMENT_HEAD",
    description: "Department oversight and management",
    level: 70,
    isSystem: true,
    parent: "ADMIN",
  },
  SECURITY_OFFICER: {
    name: "SECURITY_OFFICER",
    description: "Physical access control and security",
    level: 60,
    isSystem: true,
    parent: "ADMIN",
  },
  STAFF: {
    name: "STAFF",
    description: "Regular user access",
    level: 50,
    isSystem: true,
    parent: "DEPARTMENT_HEAD",
  },
  AUDITOR: {
    name: "AUDITOR",
    description: "Read-only audit access",
    level: 40,
    isSystem: true,
    parent: "ADMIN",
  },
} as const;

/**
 * Initialize predefined roles
 */
export async function initializePredefinedRoles() {
  const roles = Object.values(PREDEFINED_ROLES);
  
  for (const roleData of roles) {
    const { parent, ...data } = roleData;
    
    // Find parent role if specified
    let parentId: string | undefined;
    if (parent) {
      const parentRole = await prisma.role.findUnique({
        where: { name: parent },
      });
      if (parentRole) {
        parentId = parentRole.id;
      }
    }
    
    // Create or update role
    await prisma.role.upsert({
      where: { name: roleData.name },
      create: {
        ...data,
        parentId,
      },
      update: {
        description: data.description,
        level: data.level,
        parentId,
        isSystem: data.isSystem,
      },
    });
  }
}

/**
 * Get all permissions for a role (including inherited)
 */
export async function getRolePermissions(roleId: string): Promise<{
  direct: any[];
  inherited: any[];
  all: any[];
}> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      parent: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!role) {
    throw new Error("Role not found");
  }

  const direct = role.permissions;
  const inherited: any[] = [];

  // Get inherited permissions from parent
  if (role.parent) {
    const parentPermissions = await getRolePermissions(role.parent.id);
    inherited.push(...parentPermissions.all);
  }

  // Combine and deduplicate
  const allPermissions = new Map();
  
  // Add inherited first (lower priority)
  inherited.forEach((perm) => {
    allPermissions.set(perm.permissionId, {
      ...perm,
      inherited: true,
    });
  });

  // Add direct permissions (higher priority, override inherited)
  direct.forEach((perm) => {
    allPermissions.set(perm.permissionId, {
      ...perm,
      inherited: false,
    });
  });

  return {
    direct,
    inherited,
    all: Array.from(allPermissions.values()),
  };
}

/**
 * Get all permissions for a user (from all roles)
 */
export async function getUserPermissions(userId: string): Promise<{
  rolePermissions: any[];
  directPermissions: any[];
  all: any[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
      permissions: {
        include: {
          permission: true,
        },
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      },
      roleAssignments: {
        where: {
          status: "ACTIVE",
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const rolePermissions: any[] = [];
  const directPermissions = user.permissions;

  // Get permissions from primary role
  if (user.role) {
    const rolePerms = await getRolePermissions(user.role.id);
    rolePermissions.push(...rolePerms.all);
  }

  // Get permissions from additional role assignments
  for (const assignment of user.roleAssignments) {
    const rolePerms = await getRolePermissions(assignment.roleId);
    rolePermissions.push(...rolePerms.all);
  }

  // Combine and resolve conflicts
  const allPermissions = new Map();

  // Add role permissions first
  rolePermissions.forEach((perm) => {
    const key = `${perm.permission.resource}_${perm.permission.action}`;
    if (!allPermissions.has(key) || !perm.granted) {
      // Deny overrides grant
      allPermissions.set(key, {
        ...perm,
        source: "role",
      });
    }
  });

  // Add direct permissions (highest priority)
  directPermissions.forEach((perm) => {
    const key = `${perm.permission.resource}_${perm.permission.action}`;
    allPermissions.set(key, {
      ...perm,
      source: "direct",
    });
  });

  return {
    rolePermissions,
    directPermissions,
    all: Array.from(allPermissions.values()),
  };
}

/**
 * Check if user has permission (considering all roles)
 */
export async function userHasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  // SUPER_ADMIN bypass: Grant all RBAC permissions
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { legacyRole: true },
  });

  if (user?.legacyRole === "SUPER_ADMIN") {
    return true;
  }

  const userPerms = await getUserPermissions(userId);
  
  const permission = userPerms.all.find(
    (p) => p.permission.resource === resource && p.permission.action === action
  );

  if (!permission) {
    return false;
  }

  // Deny permissions override grants
  return permission.granted === true;
}

/**
 * Assign role to user
 */
export async function assignRole(
  userId: string,
  roleId: string,
  assignedBy: string,
  isTemporary: boolean = false,
  expiresAt?: Date,
  reason?: string
) {
  // Check if assignment already exists
  const existing = await prisma.roleAssignment.findUnique({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
  });

  // Calculate next review date (6 months from now)
  const nextReviewAt = new Date();
  nextReviewAt.setMonth(nextReviewAt.getMonth() + 6);

  if (existing) {
    // Update existing assignment
    return await prisma.roleAssignment.update({
      where: { id: existing.id },
      data: {
        assignedBy,
        isTemporary,
        expiresAt,
        status: "ACTIVE",
        nextReviewAt,
        updatedAt: new Date(),
      },
    });
  }

  // Create new assignment
  const assignment = await prisma.roleAssignment.create({
    data: {
      userId,
      roleId,
      assignedBy,
      isTemporary,
      expiresAt,
      nextReviewAt,
      status: "ACTIVE",
    },
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      userId: assignedBy,
      action: "rbac.role_assigned",
      resource: "user",
      resourceId: userId,
      securityLabel: "INTERNAL",
      details: {
        roleId,
        isTemporary,
        expiresAt,
        reason,
      },
    },
  });

  return assignment;
}

/**
 * Revoke role from user
 */
export async function revokeRole(
  userId: string,
  roleId: string,
  revokedBy: string,
  reason?: string
) {
  const assignment = await prisma.roleAssignment.findUnique({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
  });

  if (!assignment) {
    throw new Error("Role assignment not found");
  }

  const updated = await prisma.roleAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "REVOKED",
      deprovisionedAt: new Date(),
      deprovisionReason: reason,
      updatedAt: new Date(),
    },
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      userId: revokedBy,
      action: "rbac.role_revoked",
      resource: "user",
      resourceId: userId,
      securityLabel: "INTERNAL",
      details: {
        roleId,
        reason,
      },
    },
  });

  return updated;
}

/**
 * Request role assignment
 */
export async function requestRole(
  userId: string,
  roleId: string,
  requestedBy: string,
  reason?: string,
  justification?: string,
  isTemporary: boolean = false,
  requestedExpiresAt?: Date
) {
  // Check for existing pending request
  const existing = await prisma.roleRequest.findFirst({
    where: {
      userId,
      roleId,
      status: "PENDING",
    },
  });

  if (existing) {
    throw new Error("A pending role request already exists");
  }

  const request = await prisma.roleRequest.create({
    data: {
      userId,
      roleId,
      requestedBy,
      reason,
      justification,
      isTemporary,
      requestedExpiresAt,
      status: "PENDING",
    },
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      userId: requestedBy,
      action: "rbac.role_requested",
      resource: "user",
      resourceId: userId,
      securityLabel: "INTERNAL",
      details: {
        roleId,
        reason,
        justification,
      },
    },
  });

  return request;
}

/**
 * Approve role request
 */
export async function approveRoleRequest(
  requestId: string,
  approvedBy: string,
  isTemporary: boolean = false,
  expiresAt?: Date
) {
  const request = await prisma.roleRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Role request not found");
  }

  if (request.status !== "PENDING") {
    throw new Error("Request is not pending");
  }

  // Update request status
  await prisma.roleRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      approvedBy,
      approvedAt: new Date(),
    },
  });

  // Assign role to user
  const assignment = await assignRole(
    request.userId,
    request.roleId,
    approvedBy,
    isTemporary || request.isTemporary,
    expiresAt || request.requestedExpiresAt || undefined
  );

  // Log audit event
  await prisma.auditLog.create({
    data: {
      userId: approvedBy,
      action: "rbac.role_request_approved",
      resource: "user",
      resourceId: request.userId,
      securityLabel: "INTERNAL",
      details: {
        requestId,
        roleId: request.roleId,
      },
    },
  });

  return assignment;
}

/**
 * Reject role request
 */
export async function rejectRoleRequest(
  requestId: string,
  rejectedBy: string,
  rejectionReason?: string
) {
  const request = await prisma.roleRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Role request not found");
  }

  if (request.status !== "PENDING") {
    throw new Error("Request is not pending");
  }

  const updated = await prisma.roleRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      rejectionReason,
      updatedAt: new Date(),
    },
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      userId: rejectedBy,
      action: "rbac.role_request_rejected",
      resource: "user",
      resourceId: request.userId,
      securityLabel: "INTERNAL",
      details: {
        requestId,
        roleId: request.roleId,
        rejectionReason,
      },
    },
  });

  return updated;
}

/**
 * Review role assignment
 */
export async function reviewRole(
  roleId: string,
  reviewedBy: string,
  approved: boolean,
  assignmentId?: string,
  notes?: string,
  recommendations?: string,
  reviewType: "ANNUAL" | "AD_HOC" | "DEPROVISIONING" | "ESCALATION" = "ANNUAL"
) {
  // Calculate next review date (6 months from now)
  const nextReviewAt = new Date();
  nextReviewAt.setMonth(nextReviewAt.getMonth() + 6);

  // Create review record
  const review = await prisma.roleReview.create({
    data: {
      roleId,
      assignmentId,
      reviewedBy,
      reviewType,
      approved,
      notes,
      recommendations,
      nextReviewAt,
    },
  });

  // Update assignment if provided
  if (assignmentId) {
    await prisma.roleAssignment.update({
      where: { id: assignmentId },
      data: {
        lastReviewedAt: new Date(),
        nextReviewAt,
        status: approved ? "ACTIVE" : "SUSPENDED",
        updatedAt: new Date(),
      },
    });
  }

  // If not approved and assignment exists, revoke role
  if (!approved && assignmentId) {
    const assignment = await prisma.roleAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (assignment) {
      await revokeRole(assignment.userId, roleId, reviewedBy, notes);
    }
  }

  // Log audit event
  await prisma.auditLog.create({
    data: {
      userId: reviewedBy,
      action: "rbac.role_reviewed",
      resource: "role",
      resourceId: roleId,
      securityLabel: "INTERNAL",
      details: {
        assignmentId,
        approved,
        reviewType,
        notes,
      },
    },
  });

  return review;
}

/**
 * Get roles requiring review (6 months since last review)
 */
export async function getRolesRequiringReview(daysBeforeDue: number = 30) {
  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + daysBeforeDue);

  return await prisma.roleAssignment.findMany({
    where: {
      status: "ACTIVE",
      nextReviewAt: {
        lte: reviewDate,
      },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
    orderBy: {
      nextReviewAt: "asc",
    },
  });
}

/**
 * Deprovision expired roles
 */
export async function deprovisionExpiredRoles() {
  const expired = await prisma.roleAssignment.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: {
        lte: new Date(),
      },
    },
  });

  for (const assignment of expired) {
    await prisma.roleAssignment.update({
      where: { id: assignment.id },
      data: {
        status: "EXPIRED",
        deprovisionedAt: new Date(),
        deprovisionReason: "Automatic deprovisioning: role assignment expired",
        updatedAt: new Date(),
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: assignment.assignedBy,
        action: "rbac.role_deprovisioned",
        resource: "user",
        resourceId: assignment.userId,
        securityLabel: "INTERNAL",
        details: {
          roleId: assignment.roleId,
          reason: "Automatic expiration",
        },
      },
    });
  }

  return expired.length;
}

/**
 * Bulk assign permissions to role
 */
export async function bulkAssignPermissions(
  roleId: string,
  permissionIds: string[],
  granted: boolean = true,
  conditions?: any
) {
  // Delete existing permissions for this role
  await prisma.rolePermission.deleteMany({
    where: { roleId },
  });

  // Create new permissions
  const permissions = await Promise.all(
    permissionIds.map((permissionId) =>
      prisma.rolePermission.create({
        data: {
          roleId,
          permissionId,
          granted,
          conditions,
        },
      })
    )
  );

  return permissions;
}

/**
 * Get role-permission matrix
 */
export async function getRolePermissionMatrix() {
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: {
      level: "desc",
    },
  });

  const permissions = await prisma.permission.findMany({
    orderBy: [
      { resource: "asc" },
      { action: "asc" },
    ],
  });

  // Build matrix
  const matrix = roles.map((role) => {
    const rolePerms = new Set(
      role.permissions
        .filter((rp) => rp.granted)
        .map((rp) => rp.permissionId)
    );

    return {
      role: {
        id: role.id,
        name: role.name,
        level: role.level,
      },
      permissions: permissions.map((perm) => ({
        permission: perm,
        granted: rolePerms.has(perm.id),
      })),
    };
  });

  return {
    roles,
    permissions,
    matrix,
  };
}



