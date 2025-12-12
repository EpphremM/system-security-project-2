import { prisma } from "@/lib/prisma";
import { LogCategory, LogType } from "@/generated/prisma/enums";

/**
 * Aggregate logs in real-time
 */
export async function aggregateLogs(
  category?: LogCategory,
  timeWindow?: number // seconds
): Promise<{
  total: number;
  byType: Record<string, number>;
  byResource: Record<string, number>;
  byUser: Record<string, number>;
  recentLogs: any[];
}> {
  const now = new Date();
  const startTime = timeWindow
    ? new Date(now.getTime() - timeWindow * 1000)
    : new Date(0);

  const where: any = {
    createdAt: {
      gte: startTime,
    },
  };

  if (category) {
    where.category = category;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  // Aggregate by type
  const byType: Record<string, number> = {};
  const byResource: Record<string, number> = {};
  const byUser: Record<string, number> = {};

  for (const log of logs) {
    byType[log.logType] = (byType[log.logType] || 0) + 1;
    byResource[log.resource] = (byResource[log.resource] || 0) + 1;
    if (log.userId) {
      byUser[log.userId] = (byUser[log.userId] || 0) + 1;
    }
  }

  return {
    total: logs.length,
    byType,
    byResource,
    byUser,
    recentLogs: logs.slice(0, 100),
  };
}

/**
 * Get log statistics
 */
export async function getLogStatistics(
  startDate: Date,
  endDate: Date,
  category?: LogCategory
): Promise<{
  totalLogs: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  accessGranted: number;
  accessDenied: number;
  tamperedLogs: number;
  averageResponseTime: number;
}> {
  const where: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (category) {
    where.category = category;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    select: {
      category: true,
      logType: true,
      accessGranted: true,
      isTampered: true,
      duration: true,
    },
  });

  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let accessGranted = 0;
  let accessDenied = 0;
  let tamperedLogs = 0;
  let totalDuration = 0;
  let durationCount = 0;

  for (const log of logs) {
    byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    byType[log.logType] = (byType[log.logType] || 0) + 1;

    if (log.accessGranted === true) {
      accessGranted++;
    } else if (log.accessGranted === false) {
      accessDenied++;
    }

    if (log.isTampered) {
      tamperedLogs++;
    }

    if (log.duration) {
      totalDuration += log.duration;
      durationCount++;
    }
  }

  return {
    totalLogs: logs.length,
    byCategory,
    byType,
    accessGranted,
    accessDenied,
    tamperedLogs,
    averageResponseTime: durationCount > 0 ? totalDuration / durationCount : 0,
  };
}



