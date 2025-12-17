import { prisma } from "@/lib/prisma";
import { UserRole, SecurityLevel } from "@/generated/prisma/enums";


export async function getUserLifecycleStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  locked: number;
  pending: number;
  byDepartment: Array<{ department: string; count: number }>;
  byRole: Array<{ role: string; count: number }>;
  recentActivity: Array<{ userId: string; email: string; lastLogin: Date | null }>;
}> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      department: true,
      legacyRole: true,
      roleId: true,
      role: {
        select: { name: true },
      },
      lastLoginAt: true,
      accountLockedUntil: true,
      emailVerified: true,
    },
  });

  const stats = {
    total: users.length,
    active: 0,
    inactive: 0,
    locked: 0,
    pending: 0,
    byDepartment: {} as Record<string, number>,
    byRole: {} as Record<string, number>,
    recentActivity: [] as Array<{ userId: string; email: string; lastLogin: Date | null }>,
  };

  const now = new Date();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const user of users) {
    
    if (user.accountLockedUntil && user.accountLockedUntil > now) {
      stats.locked++;
    } else if (!user.emailVerified) {
      stats.pending++;
    } else if (user.lastLoginAt && user.lastLoginAt >= last30d) {
      stats.active++;
    } else {
      stats.inactive++;
    }

    
    stats.byDepartment[user.department] = (stats.byDepartment[user.department] || 0) + 1;

    
    const roleName = user.role?.name || user.legacyRole || "NONE";
    stats.byRole[roleName] = (stats.byRole[roleName] || 0) + 1;

    
    stats.recentActivity.push({
      userId: user.id,
      email: user.email,
      lastLogin: user.lastLoginAt,
    });
  }

  
  stats.recentActivity.sort((a, b) => {
    if (!a.lastLogin) return 1;
    if (!b.lastLogin) return -1;
    return b.lastLogin.getTime() - a.lastLogin.getTime();
  });

  return {
    ...stats,
    byDepartment: Object.entries(stats.byDepartment).map(([department, count]) => ({
      department,
      count,
    })),
    byRole: Object.entries(stats.byRole).map(([role, count]) => ({
      role,
      count,
    })),
    recentActivity: stats.recentActivity.slice(0, 20),
  };
}


export async function bulkUserOperation(
  userIds: string[],
  operation: "LOCK" | "UNLOCK" | "DEACTIVATE" | "ACTIVATE" | "DELETE" | "RESET_PASSWORD",
  performedBy: string
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const errors: Array<{ userId: string; error: string }> = [];
  let success = 0;

  for (const userId of userIds) {
    try {
      switch (operation) {
        case "LOCK":
          await prisma.user.update({
            where: { id: userId },
            data: {
              accountLockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), 
            },
          });
          break;

        case "UNLOCK":
          await prisma.user.update({
            where: { id: userId },
            data: {
              accountLockedUntil: null,
              failedLoginAttempts: 0,
            },
          });
          break;

        case "DEACTIVATE":
          
          break;

        case "ACTIVATE":
          
          break;

        case "DELETE":
          await prisma.user.delete({
            where: { id: userId },
          });
          break;

        case "RESET_PASSWORD":
          
          break;
      }
      success++;
    } catch (error) {
      errors.push({
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  
  await prisma.auditLog.create({
    data: {
      userId: performedBy,
      category: "USER_ACTIVITY",
      logType: "DATA_UPDATE",
      action: `bulk_${operation.toLowerCase()}`,
      resource: "user",
      details: {
        operation,
        userIds,
        success,
        failed: errors.length,
      },
      securityLabel: "INTERNAL",
    },
  });

  return {
    success,
    failed: errors.length,
    errors,
  };
}


export async function getAccessReviewData(options?: {
  userId?: string;
  department?: string;
  roleId?: string;
  lastReviewBefore?: Date;
}): Promise<{
  users: Array<{
    id: string;
    email: string;
    name: string;
    department: string;
    role: string;
    lastLogin: Date | null;
    permissions: number;
    roles: number;
    lastReview?: Date;
    needsReview: boolean;
  }>;
  summary: {
    total: number;
    needsReview: number;
    overdue: number;
  };
}> {
  const where: any = {};

  if (options?.userId) {
    where.id = options.userId;
  }
  if (options?.department) {
    where.department = options.department;
  }
  if (options?.roleId) {
    where.roleId = options.roleId;
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      role: {
        select: { name: true },
      },
      permissions: true,
      roleAssignments: {
        include: {
          role: true,
        },
      },
      roleReviews: {
        orderBy: { reviewDate: "desc" },
        take: 1,
      },
    },
  });

  const now = new Date();
  const reviewThreshold = options?.lastReviewBefore || new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); 


  const reviewData = users.map((user) => {
    const lastReview = user.roleReviews[0]?.reviewDate;
    const needsReview = !lastReview || lastReview < reviewThreshold;

    return {
      id: user.id,
      email: user.email,
      name: user.name || "",
      department: user.department,
      role: user.role?.name || user.legacyRole || "NONE",
      lastLogin: user.lastLoginAt,
      permissions: user.permissions.length,
      roles: user.roleAssignments.length,
      lastReview,
      needsReview,
    };
  });

  const summary = {
    total: reviewData.length,
    needsReview: reviewData.filter((u) => u.needsReview).length,
    overdue: reviewData.filter((u) => u.needsReview && u.lastReview && u.lastReview < new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)).length,
  };

  return {
    users: reviewData,
    summary,
  };
}


export async function getComplianceReport(options?: {
  startDate?: Date;
  endDate?: Date;
  complianceType?: string;
}): Promise<{
  summary: {
    totalLogs: number;
    gdprRequests: number;
    hipaaAudits: number;
    dataExports: number;
    accessReviews: number;
  };
  gdprCompliance: {
    subjectRequests: number;
    dataDeletions: number;
    dataExports: number;
  };
  hipaaCompliance: {
    auditEvents: number;
    accessLogs: number;
    violations: number;
  };
  accessReviews: {
    completed: number;
    pending: number;
    overdue: number;
  };
}> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  const [totalLogs, gdprRequests, hipaaAudits, dataExports] = await Promise.all([
    prisma.auditLog.count({
      where: {
        category: "COMPLIANCE",
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.auditLog.count({
      where: {
        complianceTags: { has: "GDPR" },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.auditLog.count({
      where: {
        complianceTags: { has: "HIPAA" },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.auditLog.count({
      where: {
        logType: "DATA_EXPORT",
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  const [subjectRequests, dataDeletions, gdprExports] = await Promise.all([
    prisma.auditLog.count({
      where: {
        logType: "SUBJECT_ACCESS_REQUEST",
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.auditLog.count({
      where: {
        logType: "DATA_DELETED_RETENTION",
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.auditLog.count({
      where: {
        logType: "DATA_EXPORT",
        complianceTags: { has: "GDPR" },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  const [hipaaEvents, accessLogs, violations] = await Promise.all([
    prisma.auditLog.count({
      where: {
        logType: "HIPAA_AUDIT",
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.auditLog.count({
      where: {
        category: "USER_ACTIVITY",
        logType: "DATA_ACCESS",
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.auditLog.count({
      where: {
        logType: "POLICY_VIOLATION",
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  const now = new Date();
  const reviewThreshold = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const overdueThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const [completedReviews, pendingReviews, overdueReviews] = await Promise.all([
    prisma.roleReview.count({
      where: {
        status: "COMPLETED",
        reviewDate: { gte: startDate, lte: endDate },
      },
    }),
    prisma.user.count({
      where: {
        roleReviews: {
          none: {
            reviewDate: { gte: reviewThreshold },
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        roleReviews: {
          some: {
            reviewDate: { lt: overdueThreshold },
          },
        },
      },
    }),
  ]);

  return {
    summary: {
      totalLogs,
      gdprRequests,
      hipaaAudits,
      dataExports,
      accessReviews: completedReviews,
    },
    gdprCompliance: {
      subjectRequests,
      dataDeletions,
      dataExports: gdprExports,
    },
    hipaaCompliance: {
      auditEvents: hipaaEvents,
      accessLogs,
      violations,
    },
    accessReviews: {
      completed: completedReviews,
      pending: pendingReviews,
      overdue: overdueReviews,
    },
  };
}



