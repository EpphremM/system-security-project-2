import { prisma } from "@/lib/prisma";
import { LogCategory, LogType, SecurityLevel } from "@/generated/prisma/enums";
import { extractClientMetadata } from "@/lib/utils/bot-prevention";

interface UserActivityLogOptions {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  request?: Request;
  securityLabel?: SecurityLevel;
}

/**
 * Log data access
 */
export async function logDataAccess(
  userId: string,
  resource: string,
  resourceId: string,
  details?: Record<string, any>,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "USER_ACTIVITY",
      logType: "DATA_ACCESS",
      action: "data_access",
      resource,
      resourceId,
      details,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Log data creation
 */
export async function logDataCreate(
  userId: string,
  resource: string,
  resourceId: string,
  data: Record<string, any>,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "USER_ACTIVITY",
      logType: "DATA_CREATE",
      action: "data_created",
      resource,
      resourceId,
      details: {
        createdData: data,
      },
      afterState: data,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Log data update
 */
export async function logDataUpdate(
  userId: string,
  resource: string,
  resourceId: string,
  beforeState: Record<string, any>,
  afterState: Record<string, any>,
  details?: Record<string, any>,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "USER_ACTIVITY",
      logType: "DATA_UPDATE",
      action: "data_updated",
      resource,
      resourceId,
      details,
      beforeState,
      afterState,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Log data deletion
 */
export async function logDataDelete(
  userId: string,
  resource: string,
  resourceId: string,
  deletedData: Record<string, any>,
  reason?: string,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "USER_ACTIVITY",
      logType: "DATA_DELETE",
      action: "data_deleted",
      resource,
      resourceId,
      details: {
        reason,
        deletedData,
      },
      beforeState: deletedData,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "CONFIDENTIAL",
      complianceTags: ["DATA_DELETION"],
    },
  });
}

/**
 * Log data export
 */
export async function logDataExport(
  userId: string,
  resource: string,
  resourceIds: string[],
  exportFormat: string,
  recordCount: number,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "USER_ACTIVITY",
      logType: "DATA_EXPORT",
      action: "data_exported",
      resource,
      details: {
        resourceIds,
        exportFormat,
        recordCount,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "CONFIDENTIAL",
      complianceTags: ["DATA_EXPORT"],
    },
  });
}

/**
 * Log permission grant
 */
export async function logPermissionGrant(
  userId: string,
  grantedBy: string,
  permissionId: string,
  resource: string,
  resourceId: string,
  permissionType: string,
  expiresAt?: Date,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "USER_ACTIVITY",
      logType: "PERMISSION_GRANT",
      action: "permission_granted",
      resource: "permission",
      resourceId: permissionId,
      details: {
        grantedBy,
        resource,
        resourceId,
        permissionType,
        expiresAt: expiresAt?.toISOString(),
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Log permission revoke
 */
export async function logPermissionRevoke(
  userId: string,
  revokedBy: string,
  permissionId: string,
  resource: string,
  resourceId: string,
  reason?: string,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "USER_ACTIVITY",
      logType: "PERMISSION_REVOKE",
      action: "permission_revoked",
      resource: "permission",
      resourceId: permissionId,
      details: {
        revokedBy,
        resource,
        resourceId,
        reason,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Log role assignment
 */
export async function logRoleAssignment(
  userId: string,
  roleId: string,
  roleName: string,
  assignedBy: string,
  expiresAt?: Date,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "USER_ACTIVITY",
      logType: "ROLE_ASSIGNED",
      action: "role_assigned",
      resource: "role",
      resourceId: roleId,
      details: {
        roleName,
        assignedBy,
        expiresAt: expiresAt?.toISOString(),
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Log role revocation
 */
export async function logRoleRevocation(
  userId: string,
  roleId: string,
  roleName: string,
  revokedBy: string,
  reason?: string,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "USER_ACTIVITY",
      logType: "ROLE_REVOKED",
      action: "role_revoked",
      resource: "role",
      resourceId: roleId,
      details: {
        roleName,
        revokedBy,
        reason,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Log ownership transfer
 */
export async function logOwnershipTransfer(
  resource: string,
  resourceId: string,
  oldOwnerId: string,
  newOwnerId: string,
  transferredBy: string,
  reason?: string,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId: transferredBy,
      category: "USER_ACTIVITY",
      logType: "OWNERSHIP_TRANSFER",
      action: "ownership_transferred",
      resource,
      resourceId,
      details: {
        oldOwnerId,
        newOwnerId,
        reason,
      },
      beforeState: { ownerId: oldOwnerId },
      afterState: { ownerId: newOwnerId },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Generic user activity logger
 */
export async function logUserActivity(options: UserActivityLogOptions) {
  const metadata = options.request ? extractClientMetadata(options.request) : {};

  return await prisma.auditLog.create({
    data: {
      userId: options.userId,
      category: "USER_ACTIVITY",
      logType: "DATA_ACCESS", // Default, can be overridden in details
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId,
      details: options.details,
      beforeState: options.beforeState,
      afterState: options.afterState,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: options.securityLabel || "INTERNAL",
    },
  });
}



