import { prisma } from "@/lib/prisma";
import { ReportType } from "@/generated/prisma/enums";


export async function generateVisitorStatisticsReport(options?: {
  startDate?: Date;
  endDate?: Date;
  department?: string;
}): Promise<any> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  const where: any = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (options?.department) {
    where.host = {
      department: options.department,
    };
  }

  const visitors = await prisma.visitor.findMany({
    where,
    include: {
      host: {
        select: { email: true, department: true },
      },
    },
  });

  
  const byDate: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  const byPurpose: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  let checkedIn = 0;
  let checkedOut = 0;

  for (const visitor of visitors) {
    const dateKey = visitor.createdAt.toISOString().split("T")[0];
    byDate[dateKey] = (byDate[dateKey] || 0) + 1;
    byDepartment[visitor.host.department] =
      (byDepartment[visitor.host.department] || 0) + 1;
    byPurpose[visitor.purpose] = (byPurpose[visitor.purpose] || 0) + 1;
    byStatus[visitor.status] = (byStatus[visitor.status] || 0) + 1;

    if (visitor.actualCheckIn) checkedIn++;
    if (visitor.actualCheckOut) checkedOut++;
  }

  
  const dates = Object.keys(byDate).sort();
  const trends = dates.map((date) => ({
    date,
    count: byDate[date],
  }));

  return {
    reportType: "VISITOR_STATISTICS",
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalVisitors: visitors.length,
      checkedIn,
      checkedOut,
      pending: visitors.filter((v) => v.status === "PENDING").length,
      approved: visitors.filter((v) => v.status === "APPROVED").length,
    },
    byDate: trends,
    byDepartment: Object.entries(byDepartment).map(([department, count]) => ({
      department,
      count,
    })),
    byPurpose: Object.entries(byPurpose).map(([purpose, count]) => ({
      purpose,
      count,
    })),
    byStatus: Object.entries(byStatus).map(([status, count]) => ({
      status,
      count,
    })),
  };
}


export async function generateSystemPerformanceReport(options?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<any> {
  const startDate = options?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  const healthRecords = await prisma.systemHealth.findMany({
    where: {
      recordedAt: { gte: startDate, lte: endDate },
    },
    orderBy: { recordedAt: "asc" },
  });

  if (healthRecords.length === 0) {
    return {
      reportType: "SYSTEM_PERFORMANCE",
      period: { start: startDate, end: endDate },
      message: "No performance data available for this period",
    };
  }

  
  const cpuValues = healthRecords
    .map((r) => r.cpuUsage)
    .filter((v) => v !== null) as number[];
  const memoryValues = healthRecords
    .map((r) => r.memoryUsage)
    .filter((v) => v !== null) as number[];
  const diskValues = healthRecords
    .map((r) => r.diskUsage)
    .filter((v) => v !== null) as number[];
  const latencyValues = healthRecords
    .map((r) => r.networkLatency)
    .filter((v) => v !== null) as number[];

  const avgCPU =
    cpuValues.length > 0
      ? cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length
      : 0;
  const avgMemory =
    memoryValues.length > 0
      ? memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length
      : 0;
  const avgDisk =
    diskValues.length > 0
      ? diskValues.reduce((a, b) => a + b, 0) / diskValues.length
      : 0;
  const avgLatency =
    latencyValues.length > 0
      ? latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length
      : 0;

  
  const byStatus: Record<string, number> = {};
  for (const record of healthRecords) {
    byStatus[record.status] = (byStatus[record.status] || 0) + 1;
  }

  
  const healthyCount = healthRecords.filter((r) => r.status === "HEALTHY").length;
  const uptimePercentage = (healthyCount / healthRecords.length) * 100;

  return {
    reportType: "SYSTEM_PERFORMANCE",
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalRecords: healthRecords.length,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      averageCPU: Math.round(avgCPU * 100) / 100,
      averageMemory: Math.round(avgMemory * 100) / 100,
      averageDisk: Math.round(avgDisk * 100) / 100,
      averageLatency: Math.round(avgLatency * 100) / 100,
    },
    byStatus: Object.entries(byStatus).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / healthRecords.length) * 100 * 100) / 100,
    })),
    metrics: {
      cpu: {
        average: avgCPU,
        min: Math.min(...cpuValues),
        max: Math.max(...cpuValues),
      },
      memory: {
        average: avgMemory,
        min: Math.min(...memoryValues),
        max: Math.max(...memoryValues),
      },
      disk: {
        average: avgDisk,
        min: Math.min(...diskValues),
        max: Math.max(...diskValues),
      },
      latency: {
        average: avgLatency,
        min: Math.min(...latencyValues),
        max: Math.max(...latencyValues),
      },
    },
  };
}


export async function generateBackupSuccessReport(options?: {
  startDate?: Date;
  endDate?: Date;
  backupType?: string;
}): Promise<any> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  const where: any = {
    startedAt: { gte: startDate, lte: endDate },
  };

  if (options?.backupType) where.backupType = options.backupType;

  const backups = await prisma.backupLog.findMany({
    where,
    orderBy: { startedAt: "desc" },
  });

  
  const byType: Record<string, any> = {};
  const byStatus: Record<string, number> = {};
  const byStorageLocation: Record<string, number> = {};

  let totalSize = 0;
  let successful = 0;
  let failed = 0;

  for (const backup of backups) {
    
    if (!byType[backup.backupType]) {
      byType[backup.backupType] = {
        total: 0,
        successful: 0,
        failed: 0,
        totalSize: 0,
      };
    }
    byType[backup.backupType].total++;
    if (backup.status === "COMPLETED") {
      byType[backup.backupType].successful++;
      successful++;
    } else if (backup.status === "FAILED") {
      byType[backup.backupType].failed++;
      failed++;
    }
    if (backup.size) {
      byType[backup.backupType].totalSize += Number(backup.size);
      totalSize += Number(backup.size);
    }

    
    byStatus[backup.status] = (byStatus[backup.status] || 0) + 1;

    
    byStorageLocation[backup.storageLocation] =
      (byStorageLocation[backup.storageLocation] || 0) + 1;
  }

  
  const successRate =
    backups.length > 0 ? (successful / backups.length) * 100 : 0;

  return {
    reportType: "BACKUP_SUCCESS",
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalBackups: backups.length,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100,
      totalSize: totalSize,
      averageSize: backups.length > 0 ? totalSize / backups.length : 0,
    },
    byType: Object.entries(byType).map(([type, data]) => ({
      type,
      ...data,
      successRate:
        data.total > 0
          ? Math.round((data.successful / data.total) * 100 * 100) / 100
          : 0,
    })),
    byStatus: Object.entries(byStatus).map(([status, count]) => ({
      status,
      count,
    })),
    byStorageLocation: Object.entries(byStorageLocation).map(
      ([location, count]) => ({
        location,
        count,
      })
    ),
    recentBackups: backups.slice(0, 20),
  };
}


export async function generateUserActivitySummaryReport(options?: {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  department?: string;
}): Promise<any> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  const where: any = {
    category: "USER_ACTIVITY",
    createdAt: { gte: startDate, lte: endDate },
  };

  if (options?.userId) where.userId = options.userId;

  const activityLogs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: { email: true, name: true, department: true },
      },
    },
  });

  
  const filteredLogs = options?.department
    ? activityLogs.filter((log) => log.user?.department === options.department)
    : activityLogs;

  
  const byUser: Record<string, any> = {};
  const byAction: Record<string, number> = {};
  const byResource: Record<string, number> = {};

  for (const log of filteredLogs) {
    if (log.user) {
      const email = log.user.email;
      if (!byUser[email]) {
        byUser[email] = {
          user: {
            email: log.user.email,
            name: log.user.name,
            department: log.user.department,
          },
          activities: [],
          totalActivities: 0,
        };
      }
      byUser[email].activities.push({
        timestamp: log.createdAt,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
      });
      byUser[email].totalActivities++;
    }

    byAction[log.action] = (byAction[log.action] || 0) + 1;
    byResource[log.resource] = (byResource[log.resource] || 0) + 1;
  }

  
  const topUsers = Object.values(byUser)
    .sort((a: any, b: any) => b.totalActivities - a.totalActivities)
    .slice(0, 20);

  return {
    reportType: "USER_ACTIVITY",
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalActivities: filteredLogs.length,
      uniqueUsers: Object.keys(byUser).length,
      uniqueActions: Object.keys(byAction).length,
      uniqueResources: Object.keys(byResource).length,
    },
    byUser: topUsers,
    byAction: Object.entries(byAction).map(([action, count]) => ({
      action,
      count,
    })),
    byResource: Object.entries(byResource).map(([resource, count]) => ({
      resource,
      count,
    })),
  };
}



