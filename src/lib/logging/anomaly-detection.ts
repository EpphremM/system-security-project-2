import { prisma } from "@/lib/prisma";
import { LogCategory, LogType } from "@/generated/prisma/enums";

interface AnomalyRule {
  name: string;
  condition: (logs: any[]) => boolean;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
}


export async function detectAnomalies(
  timeWindow: number = 3600 
): Promise<{
  anomalies: any[];
  count: number;
}> {
  const now = new Date();
  const startTime = new Date(now.getTime() - timeWindow * 1000);

  
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: startTime,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  const anomalies: any[] = [];

  
  const rules: AnomalyRule[] = [
    {
      name: "Multiple Failed Auth Attempts",
      condition: (logs) => {
        const failedAuths = logs.filter(
          (l) => l.logType === "AUTH_FAILURE"
        );
        return failedAuths.length > 10;
      },
      severity: "HIGH",
      description: "More than 10 failed authentication attempts in time window",
    },
    {
      name: "Multiple Access Denials",
      condition: (logs) => {
        const denied = logs.filter((l) => l.accessGranted === false);
        return denied.length > 20;
      },
      severity: "MEDIUM",
      description: "More than 20 access denials in time window",
    },
    {
      name: "Tampered Logs Detected",
      condition: (logs) => {
        return logs.some((l) => l.isTampered);
      },
      severity: "CRITICAL",
      description: "One or more logs have been tampered with",
    },
    {
      name: "Unusual Data Export Volume",
      condition: (logs) => {
        const exports = logs.filter((l) => l.logType === "DATA_EXPORT");
        return exports.length > 5;
      },
      severity: "MEDIUM",
      description: "Unusually high number of data exports",
    },
    {
      name: "Multiple Policy Violations",
      condition: (logs) => {
        const violations = logs.filter(
          (l) => l.logType === "POLICY_VIOLATION"
        );
        return violations.length > 5;
      },
      severity: "HIGH",
      description: "Multiple policy violations detected",
    },
    {
      name: "Account Lockouts",
      condition: (logs) => {
        const lockouts = logs.filter((l) => l.logType === "AUTH_LOCKOUT");
        return lockouts.length > 3;
      },
      severity: "HIGH",
      description: "Multiple account lockouts in time window",
    },
    {
      name: "Unusual User Activity",
      condition: (logs) => {
        
        const userActivity: Record<string, number> = {};
        for (const log of logs) {
          if (log.userId) {
            userActivity[log.userId] = (userActivity[log.userId] || 0) + 1;
          }
        }
        const maxActivity = Math.max(...Object.values(userActivity), 0);
        return maxActivity > 100; 
      },
      severity: "MEDIUM",
      description: "Unusually high activity from single user",
    },
    {
      name: "System Errors Spike",
      condition: (logs) => {
        const errors = logs.filter(
          (l) => l.logType === "APP_ERROR" || l.logType === "EXCEPTION"
        );
        return errors.length > 10;
      },
      severity: "HIGH",
      description: "Unusually high number of system errors",
    },
  ];

  
  for (const rule of rules) {
    if (rule.condition(logs)) {
      
      const anomaly = await prisma.logAnomaly.create({
        data: {
          anomalyType: rule.name,
          severity: rule.severity,
          description: rule.description,
          metadata: {
            timeWindow,
            logCount: logs.length,
            detectedAt: now.toISOString(),
          },
        },
      });

      anomalies.push(anomaly);
    }
  }

  return {
    anomalies,
    count: anomalies.length,
  };
}


export async function getRecentAnomalies(
  limit: number = 50,
  severity?: string
): Promise<any[]> {
  const where: any = {
    resolved: false,
  };

  if (severity) {
    where.severity = severity;
  }

  return await prisma.logAnomaly.findMany({
    where,
    orderBy: {
      detectedAt: "desc",
    },
    take: limit,
  });
}


export async function resolveAnomaly(
  anomalyId: string,
  resolvedBy: string,
  resolutionNotes?: string
): Promise<void> {
  await prisma.logAnomaly.update({
    where: { id: anomalyId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
      metadata: {
        resolutionNotes,
      },
    },
  });
}


export async function detectMLAnomalies(logs: any[]): Promise<any[]> {
  
  
  return [];
}



