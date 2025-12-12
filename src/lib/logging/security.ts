import { prisma } from "@/lib/prisma";
import { LogCategory, LogType, SecurityLevel, PolicyType } from "@/generated/prisma/enums";
import { extractClientMetadata } from "@/lib/utils/bot-prevention";

interface SecurityLogOptions {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  accessGranted?: boolean;
  policyId?: string;
  policyType?: PolicyType;
  denialReason?: string;
  securityLabel?: SecurityLevel;
  request?: Request;
}

/**
 * Log authentication success
 */
export async function logAuthSuccess(
  userId: string,
  authMethod: string,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "SECURITY",
      logType: "AUTH_SUCCESS",
      action: "authentication",
      resource: "user",
      resourceId: userId,
      details: {
        authMethod,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      accessGranted: true,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Log authentication failure
 */
export async function logAuthFailure(
  email: string,
  reason: string,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "SECURITY",
      logType: "AUTH_FAILURE",
      action: "authentication_failed",
      resource: "user",
      details: {
        email,
        reason,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      accessGranted: false,
      denialReason: reason,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Log account lockout
 */
export async function logAuthLockout(
  userId: string,
  reason: string,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "SECURITY",
      logType: "AUTH_LOCKOUT",
      action: "account_locked",
      resource: "user",
      resourceId: userId,
      details: {
        reason,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      accessGranted: false,
      denialReason: reason,
      securityLabel: "CONFIDENTIAL",
    },
  });
}

/**
 * Log MFA success
 */
export async function logMFASuccess(
  userId: string,
  mfaMethod: string,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "SECURITY",
      logType: "MFA_SUCCESS",
      action: "mfa_verification",
      resource: "user",
      resourceId: userId,
      details: {
        mfaMethod,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      accessGranted: true,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Log MFA failure
 */
export async function logMFAFailure(
  userId: string,
  mfaMethod: string,
  reason: string,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "SECURITY",
      logType: "MFA_FAILURE",
      action: "mfa_verification_failed",
      resource: "user",
      resourceId: userId,
      details: {
        mfaMethod,
        reason,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      accessGranted: false,
      denialReason: reason,
      securityLabel: "INTERNAL",
    },
  });
}

/**
 * Log access control decision
 */
export async function logAccessDecision(options: SecurityLogOptions) {
  const metadata = options.request ? extractClientMetadata(options.request) : {};

  return await prisma.auditLog.create({
    data: {
      userId: options.userId,
      category: "SECURITY",
      logType: options.accessGranted ? "ACCESS_GRANTED" : "ACCESS_DENIED",
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId,
      details: options.details,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      accessGranted: options.accessGranted,
      policyId: options.policyId,
      policyType: options.policyType,
      denialReason: options.denialReason,
      securityLabel: options.securityLabel || "INTERNAL",
    },
  });
}

/**
 * Log policy violation
 */
export async function logPolicyViolation(
  userId: string,
  policyId: string,
  policyType: PolicyType,
  resource: string,
  resourceId: string,
  violationReason: string,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "SECURITY",
      logType: "POLICY_VIOLATION",
      action: "policy_violation",
      resource,
      resourceId,
      details: {
        policyId,
        policyType,
        violationReason,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      accessGranted: false,
      policyId,
      policyType,
      denialReason: violationReason,
      securityLabel: "CONFIDENTIAL",
    },
  });
}

/**
 * Log security configuration change
 */
export async function logSecurityConfigChange(
  userId: string,
  configKey: string,
  oldValue: any,
  newValue: any,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "SECURITY",
      logType: "SECURITY_CONFIG_CHANGE",
      action: "security_config_changed",
      resource: "system_config",
      details: {
        configKey,
        oldValue,
        newValue,
      },
      beforeState: { value: oldValue },
      afterState: { value: newValue },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "CONFIDENTIAL",
    },
  });
}

/**
 * Log clearance change
 */
export async function logClearanceChange(
  userId: string,
  changedBy: string,
  oldLevel: SecurityLevel,
  newLevel: SecurityLevel,
  oldCompartments: string[],
  newCompartments: string[],
  reason?: string,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "SECURITY",
      logType: "CLEARANCE_CHANGE",
      action: "clearance_changed",
      resource: "user_clearance",
      resourceId: userId,
      details: {
        changedBy,
        reason,
      },
      beforeState: {
        level: oldLevel,
        compartments: oldCompartments,
      },
      afterState: {
        level: newLevel,
        compartments: newCompartments,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "CONFIDENTIAL",
      complianceTags: ["SECURITY_CLEARANCE"],
    },
  });
}

/**
 * Log permission change
 */
export async function logPermissionChange(
  userId: string,
  changedBy: string,
  permissionId: string,
  action: "grant" | "revoke",
  resource: string,
  details?: Record<string, any>,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "SECURITY",
      logType: "PERMISSION_CHANGE",
      action: `permission_${action}`,
      resource: "permission",
      resourceId: permissionId,
      details: {
        changedBy,
        ...details,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "INTERNAL",
    },
  });
}



