import { prisma } from "@/lib/prisma";
import { ReportType } from "@/generated/prisma/enums";


export async function generateAccessControlReviewReport(options?: {
  startDate?: Date;
  endDate?: Date;
  department?: string;
  roleId?: string;
}): Promise<any> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  
  const { getAccessReviewData } = await import("@/lib/dashboard/user-management");
  const reviewData = await getAccessReviewData({
    department: options?.department,
    roleId: options?.roleId,
    lastReviewBefore: startDate,
  });

  
  const permissionChanges = await prisma.auditLog.findMany({
    where: {
      logType: "PERMISSION_CHANGE",
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  
  const roleAssignments = await prisma.roleAssignment.findMany({
    where: {
      assignedAt: { gte: startDate, lte: endDate },
    },
    include: {
      user: {
        select: { email: true, name: true },
      },
      role: {
        select: { name: true },
      },
    },
  });

  return {
    reportType: "ACCESS_CONTROL_REVIEW",
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalUsers: reviewData.summary.total,
      needsReview: reviewData.summary.needsReview,
      overdue: reviewData.summary.overdue,
    },
    users: reviewData.users,
    permissionChanges: permissionChanges.map((log) => ({
      timestamp: log.createdAt,
      user: log.user?.email,
      action: log.action,
      details: log.details,
    })),
    roleAssignments: roleAssignments.map((assignment) => ({
      timestamp: assignment.assignedAt,
      user: assignment.user.email,
      role: assignment.role.name,
      assignedBy: assignment.assignedBy,
      expiresAt: assignment.expiresAt,
    })),
  };
}


export async function generateUserPermissionReport(options?: {
  userId?: string;
  department?: string;
  roleId?: string;
}): Promise<any> {
  const where: any = {};
  if (options?.userId) where.id = options.userId;
  if (options?.department) where.department = options.department;
  if (options?.roleId) where.roleId = options.roleId;

  const users = await prisma.user.findMany({
    where,
    include: {
      role: {
        select: { name: true },
      },
      permissions: {
        include: {
          resource: {
            select: { name: true, resourceType: true },
          },
        },
      },
      roleAssignments: {
        include: {
          role: {
            select: { name: true, permissions: true },
          },
        },
      },
      userClearance: {
        select: { level: true, categories: true, compartments: true },
      },
    },
  });

  return {
    reportType: "USER_PERMISSION",
    generatedAt: new Date(),
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      role: user.role?.name || user.legacyRole,
      clearance: user.userClearance
        ? {
            level: user.userClearance.level,
            categories: user.userClearance.categories,
            compartments: user.userClearance.compartments,
          }
        : null,
      directPermissions: user.permissions.map((p) => ({
        resource: p.resource.name,
        resourceType: p.resource.resourceType,
        permission: p.permission,
      })),
      rolePermissions: user.roleAssignments.flatMap((assignment) =>
        assignment.role.permissions.map((p) => ({
          role: assignment.role.name,
          resource: p.resource,
          action: p.action,
        }))
      ),
    })),
  };
}


export async function generateDataAccessAuditTrailReport(options?: {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
}): Promise<any> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  const where: any = {
    category: "USER_ACTIVITY",
    logType: "DATA_ACCESS",
    createdAt: { gte: startDate, lte: endDate },
  };

  if (options?.userId) where.userId = options.userId;
  if (options?.resourceType) where.resource = options.resourceType;
  if (options?.resourceId) where.resourceId = options.resourceId;

  const accessLogs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: { email: true, name: true, department: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  
  const byUser: Record<string, any> = {};
  for (const log of accessLogs) {
    if (log.user) {
      const email = log.user.email;
      if (!byUser[email]) {
        byUser[email] = {
          user: {
            email: log.user.email,
            name: log.user.name,
            department: log.user.department,
          },
          accesses: [],
          totalAccesses: 0,
        };
      }
      byUser[email].accesses.push({
        timestamp: log.createdAt,
        resource: log.resource,
        resourceId: log.resourceId,
        ipAddress: log.ipAddress,
        location: log.location,
      });
      byUser[email].totalAccesses++;
    }
  }

  
  const byResource: Record<string, any> = {};
  for (const log of accessLogs) {
    const resourceKey = `${log.resource}:${log.resourceId || "N/A"}`;
    if (!byResource[resourceKey]) {
      byResource[resourceKey] = {
        resource: log.resource,
        resourceId: log.resourceId,
        accesses: [],
        totalAccesses: 0,
        uniqueUsers: new Set<string>(),
      };
    }
    byResource[resourceKey].accesses.push({
      timestamp: log.createdAt,
      user: log.user?.email,
      ipAddress: log.ipAddress,
      location: log.location,
    });
    byResource[resourceKey].totalAccesses++;
    if (log.user?.email) {
      byResource[resourceKey].uniqueUsers.add(log.user.email);
    }
  }

  return {
    reportType: "DATA_ACCESS_AUDIT",
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalAccesses: accessLogs.length,
      uniqueUsers: Object.keys(byUser).length,
      uniqueResources: Object.keys(byResource).length,
    },
    byUser: Object.values(byUser).map((data) => ({
      ...data,
      uniqueUsers: undefined,
    })),
    byResource: Object.values(byResource).map((data) => ({
      ...data,
      uniqueUsers: Array.from(data.uniqueUsers),
    })),
    rawLogs: accessLogs.slice(0, 1000), 

  };
}


export async function generatePolicyComplianceReport(options?: {
  startDate?: Date;
  endDate?: Date;
  policyId?: string;
  policyType?: string;
}): Promise<any> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  const where: any = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (options?.policyId) {
    where.resourceId = options.policyId;
    where.resource = "access_policy";
  }

  

  const violations = await prisma.auditLog.findMany({
    where: {
      ...where,
      logType: "POLICY_VIOLATION",
    },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  

  const evaluations = await prisma.auditLog.findMany({
    where: {
      ...where,
      logType: { in: ["ACCESS_GRANTED", "ACCESS_DENIED"] },
      policyId: { not: null },
    },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  

  const policiesWhere: any = {};
  if (options?.policyId) policiesWhere.id = options.policyId;
  if (options?.policyType) policiesWhere.policyType = options.policyType;

  const policies = await prisma.accessPolicy.findMany({
    where: policiesWhere,
    include: {
      owner: {
        select: { email: true },
      },
    },
  });

  

  const policyCompliance = policies.map((policy) => {
    const policyViolations = violations.filter(
      (v) => v.policyId === policy.id
    );
    const policyEvaluations = evaluations.filter(
      (e) => e.policyId === policy.id
    );
    const granted = policyEvaluations.filter((e) => e.accessGranted).length;
    const denied = policyEvaluations.filter((e) => !e.accessGranted).length;

    return {
      policyId: policy.id,
      policyName: policy.name,
      policyType: policy.policyType,
      enabled: policy.enabled,
      violations: policyViolations.length,
      evaluations: {
        total: policyEvaluations.length,
        granted,
        denied,
        complianceRate: policyEvaluations.length > 0
          ? (granted / policyEvaluations.length) * 100
          : 100,
      },
      recentViolations: policyViolations.slice(0, 10),
    };
  });

  return {
    reportType: "POLICY_COMPLIANCE",
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalPolicies: policies.length,
      enabledPolicies: policies.filter((p) => p.enabled).length,
      totalViolations: violations.length,
      totalEvaluations: evaluations.length,
      overallComplianceRate:
        evaluations.length > 0
          ? (evaluations.filter((e) => e.accessGranted).length / evaluations.length) * 100
          : 100,
    },
    policyCompliance,
    recentViolations: violations.slice(0, 50),
  };
}



