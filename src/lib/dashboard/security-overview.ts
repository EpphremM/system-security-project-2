import { prisma } from "@/lib/prisma";


export async function getSecurityOverview(): Promise<{
  threats: {
    active: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  sessions: {
    active: number;
    recent: number;
  };
  failedLogins: {
    last24h: number;
    last7d: number;
    topIPs: Array<{ ip: string; count: number }>;
  };
  systemHealth: {
    status: string;
    metrics: {
      cpu?: number;
      memory?: number;
      disk?: number;
      networkLatency?: number;
    };
    services: {
      database: string;
      api: string;
      backup: string;
    };
  };
}> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  
  const [activeThreats, criticalThreats, highThreats, mediumThreats, lowThreats] = await Promise.all([
    prisma.threatIntelligence.count({
      where: { status: "ACTIVE" },
    }),
    prisma.threatIntelligence.count({
      where: { status: "ACTIVE", severity: "CRITICAL" },
    }),
    prisma.threatIntelligence.count({
      where: { status: "ACTIVE", severity: "HIGH" },
    }),
    prisma.threatIntelligence.count({
      where: { status: "ACTIVE", severity: "MEDIUM" },
    }),
    prisma.threatIntelligence.count({
      where: { status: "ACTIVE", severity: "LOW" },
    }),
  ]);

  
  const [activeSessions, recentSessions] = await Promise.all([
    prisma.session.count({
      where: {
        isActive: true,
        expiresAt: { gt: now },
      },
    }),
    prisma.session.count({
      where: {
        createdAt: { gte: last24h },
      },
    }),
  ]);

  
  const failedLogins24h = await prisma.auditLog.count({
    where: {
      logType: "AUTH_FAILURE",
      createdAt: { gte: last24h },
    },
  });

  const failedLogins7d = await prisma.auditLog.count({
    where: {
      logType: "AUTH_FAILURE",
      createdAt: { gte: last7d },
    },
  });

  
  const failedLoginLogs = await prisma.auditLog.findMany({
    where: {
      logType: "AUTH_FAILURE",
      createdAt: { gte: last24h },
      ipAddress: { not: null },
    },
    select: {
      ipAddress: true,
    },
  });

  const ipCounts: Record<string, number> = {};
  for (const log of failedLoginLogs) {
    if (log.ipAddress) {
      ipCounts[log.ipAddress] = (ipCounts[log.ipAddress] || 0) + 1;
    }
  }

  const topIPs = Object.entries(ipCounts)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  
  const latestHealth = await prisma.systemHealth.findFirst({
    orderBy: { recordedAt: "desc" },
  });

  
  const systemHealth = {
    status: latestHealth?.status || "UNKNOWN",
    metrics: {
      cpu: latestHealth?.cpuUsage,
      memory: latestHealth?.memoryUsage,
      disk: latestHealth?.diskUsage,
      networkLatency: latestHealth?.networkLatency,
    },
    services: {
      database: latestHealth?.databaseStatus || "UNKNOWN",
      api: latestHealth?.apiStatus || "UNKNOWN",
      backup: latestHealth?.backupStatus || "UNKNOWN",
    },
  };

  return {
    threats: {
      active: activeThreats,
      critical: criticalThreats,
      high: highThreats,
      medium: mediumThreats,
      low: lowThreats,
    },
    sessions: {
      active: activeSessions,
      recent: recentSessions,
    },
    failedLogins: {
      last24h: failedLogins24h,
      last7d: failedLogins7d,
      topIPs,
    },
    systemHealth,
  };
}


export async function getThreatDashboard(): Promise<{
  activeThreats: any[];
  threatMap: Array<{ ip: string; country?: string; severity: string; count: number }>;
  threatTrends: Array<{ date: string; count: number }>;
}> {
  try {
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    
    const activeThreats = await prisma.threatIntelligence.findMany({
    where: {
      status: { in: ["ACTIVE", "INVESTIGATING"] },
    },
    orderBy: {
      detectedAt: "desc",
    },
    take: 50,
  });

  
  const threatIPs = await prisma.threatIntelligence.findMany({
    where: {
      ipAddress: { not: null },
      detectedAt: { gte: last7d },
    },
    select: {
      ipAddress: true,
      country: true,
      severity: true,
    },
  });

  const threatMapData: Record<string, { country?: string; severity: string; count: number }> = {};
  for (const threat of threatIPs) {
    if (threat.ipAddress) {
      const key = threat.ipAddress;
      if (!threatMapData[key]) {
        threatMapData[key] = {
          country: threat.country || undefined,
          severity: threat.severity,
          count: 0,
        };
      }
      threatMapData[key].count++;
    }
  }

  const threatMap = Object.entries(threatMapData).map(([ip, data]) => ({
    ip,
    ...data,
  }));

  
  const threatTrends: Array<{ date: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = await prisma.threatIntelligence.count({
      where: {
        detectedAt: {
          gte: date,
          lt: nextDate,
        },
      },
    });

    threatTrends.push({
      date: date.toISOString().split("T")[0],
      count,
    });
  }

    return {
      activeThreats,
      threatMap,
      threatTrends,
    };
  } catch (error) {
    console.error("Error in getThreatDashboard:", error);
    
    return {
      activeThreats: [],
      threatMap: [],
      threatTrends: [],
    };
  }
}


export async function getActiveSessionsMonitor(): Promise<{
  total: number;
  byUser: Array<{ userId: string; email: string; count: number; lastActivity: Date }>;
  byDevice: Array<{ deviceType: string; count: number }>;
  byLocation: Array<{ location: string; count: number }>;
  recentActivity: any[];
}> {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const sessions = await prisma.session.findMany({
    where: {
      isActive: true,
      expiresAt: { gt: now },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      lastActivityAt: "desc",
    },
  });

  
  const byUserMap: Record<string, { email: string; count: number; lastActivity: Date }> = {};
  for (const session of sessions) {
    if (session.user) {
      const userId = session.user.id;
      if (!byUserMap[userId]) {
        byUserMap[userId] = {
          email: session.user.email,
          count: 0,
          lastActivity: session.lastActivityAt || session.createdAt,
        };
      }
      byUserMap[userId].count++;
      if (session.lastActivityAt && session.lastActivityAt > byUserMap[userId].lastActivity) {
        byUserMap[userId].lastActivity = session.lastActivityAt;
      }
    }
  }

  const byUser = Object.entries(byUserMap).map(([userId, data]) => ({
    userId,
    ...data,
  }));

  
  const byDeviceMap: Record<string, number> = {};
  for (const session of sessions) {
    const deviceType = session.deviceType || "UNKNOWN";
    byDeviceMap[deviceType] = (byDeviceMap[deviceType] || 0) + 1;
  }

  const byDevice = Object.entries(byDeviceMap).map(([deviceType, count]) => ({
    deviceType,
    count,
  }));

  
  const byLocationMap: Record<string, number> = {};
  for (const session of sessions) {
    const location = session.location || "UNKNOWN";
    byLocationMap[location] = (byLocationMap[location] || 0) + 1;
  }

  const byLocation = Object.entries(byLocationMap).map(([location, count]) => ({
    location,
    count,
  }));

  
  const recentActivity = sessions
    .filter((s) => s.lastActivityAt && s.lastActivityAt >= last24h)
    .slice(0, 20)
    .map((s) => ({
      userId: s.userId,
      email: s.user?.email,
      deviceType: s.deviceType,
      location: s.location,
      lastActivity: s.lastActivityAt,
    }));

    return {
      total: sessions.length,
      byUser,
      byDevice,
      byLocation,
      recentActivity,
    };
  } catch (error) {
    console.error("Error in getActiveSessionsMonitor:", error);
    
    return {
      total: 0,
      byUser: [],
      byDevice: [],
      byLocation: [],
      recentActivity: [],
    };
  }
}


export async function recordSystemHealth(metrics: {
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  networkLatency?: number;
  databaseStatus?: string;
  apiStatus?: string;
  backupStatus?: string;
}): Promise<string> {
  
  let status: string = "HEALTHY";
  if (metrics.cpuUsage && metrics.cpuUsage > 90) status = "CRITICAL";
  else if (metrics.memoryUsage && metrics.memoryUsage > 90) status = "CRITICAL";
  else if (metrics.diskUsage && metrics.diskUsage > 90) status = "CRITICAL";
  else if (metrics.cpuUsage && metrics.cpuUsage > 80) status = "WARNING";
  else if (metrics.memoryUsage && metrics.memoryUsage > 80) status = "WARNING";
  else if (metrics.diskUsage && metrics.diskUsage > 80) status = "WARNING";

  
  const now = new Date();
  const activeThreats = await prisma.threatIntelligence.count({
    where: { status: "ACTIVE" },
  });

  const failedLogins = await prisma.auditLog.count({
    where: {
      logType: "AUTH_FAILURE",
      createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) }, 
    },
  });

  const activeSessions = await prisma.session.count({
    where: {
      isActive: true,
      expiresAt: { gt: now },
    },
  });

  const health = await prisma.systemHealth.create({
    data: {
      status,
      cpuUsage: metrics.cpuUsage,
      memoryUsage: metrics.memoryUsage,
      diskUsage: metrics.diskUsage,
      networkLatency: metrics.networkLatency,
      databaseStatus: metrics.databaseStatus,
      apiStatus: metrics.apiStatus,
      backupStatus: metrics.backupStatus,
      activeThreats,
      failedLogins,
      activeSessions,
    },
  });

  return health.id;
}

