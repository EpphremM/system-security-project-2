import { prisma } from "@/lib/prisma";
import { ReportType } from "@/generated/prisma/enums";

/**
 * Generate threat intelligence report
 */
export async function generateThreatIntelligenceReport(options?: {
  startDate?: Date;
  endDate?: Date;
  severity?: string;
  threatType?: string;
}): Promise<any> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  const where: any = {
    detectedAt: { gte: startDate, lte: endDate },
  };

  if (options?.severity) where.severity = options.severity;
  if (options?.threatType) where.threatType = options.threatType;

  const threats = await prisma.threatIntelligence.findMany({
    where,
    orderBy: { detectedAt: "desc" },
  });

  // Group by type
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const threat of threats) {
    byType[threat.threatType] = (byType[threat.threatType] || 0) + 1;
    bySeverity[threat.severity] = (bySeverity[threat.severity] || 0) + 1;
    byStatus[threat.status] = (byStatus[threat.status] || 0) + 1;
    if (threat.country) {
      byCountry[threat.country] = (byCountry[threat.country] || 0) + 1;
    }
  }

  // Get top IPs
  const ipThreats = threats.filter((t) => t.ipAddress);
  const ipCounts: Record<string, number> = {};
  for (const threat of ipThreats) {
    if (threat.ipAddress) {
      ipCounts[threat.ipAddress] = (ipCounts[threat.ipAddress] || 0) + 1;
    }
  }

  const topIPs = Object.entries(ipCounts)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    reportType: "THREAT_INTELLIGENCE",
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalThreats: threats.length,
      active: threats.filter((t) => t.status === "ACTIVE").length,
      blocked: threats.filter((t) => t.blocked).length,
      critical: threats.filter((t) => t.severity === "CRITICAL").length,
    },
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    bySeverity: Object.entries(bySeverity).map(([severity, count]) => ({
      severity,
      count,
    })),
    byStatus: Object.entries(byStatus).map(([status, count]) => ({
      status,
      count,
    })),
    byCountry: Object.entries(byCountry).map(([country, count]) => ({
      country,
      count,
    })),
    topIPs,
    threats: threats.slice(0, 100),
  };
}

/**
 * Generate vulnerability assessment report
 */
export async function generateVulnerabilityAssessmentReport(options?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<any> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  // Get failed login attempts (potential brute force)
  const failedLogins = await prisma.auditLog.findMany({
    where: {
      logType: "AUTH_FAILURE",
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      ipAddress: true,
      createdAt: true,
    },
  });

  // Group by IP
  const ipFailures: Record<string, number> = {};
  for (const log of failedLogins) {
    if (log.ipAddress) {
      ipFailures[log.ipAddress] = (ipFailures[log.ipAddress] || 0) + 1;
    }
  }

  const suspiciousIPs = Object.entries(ipFailures)
    .filter(([_, count]) => count >= 5)
    .map(([ip, count]) => ({ ip, failures: count }))
    .sort((a, b) => b.failures - a.failures);

  // Get policy violations
  const policyViolations = await prisma.auditLog.count({
    where: {
      logType: "POLICY_VIOLATION",
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  // Get unauthorized access attempts
  const unauthorizedAccess = await prisma.auditLog.count({
    where: {
      logType: "ACCESS_DENIED",
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  // Get users with excessive permissions
  const usersWithManyPermissions = await prisma.user.findMany({
    include: {
      permissions: true,
      roleAssignments: {
        include: {
          role: true,
        },
      },
    },
  });

  const excessivePermissions = usersWithManyPermissions
    .filter((u) => u.permissions.length > 20 || u.roleAssignments.length > 5)
    .map((u) => ({
      userId: u.id,
      email: u.email,
      directPermissions: u.permissions.length,
      roles: u.roleAssignments.length,
    }));

  // Get inactive accounts (potential security risk)
  const inactiveThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const inactiveAccounts = await prisma.user.count({
    where: {
      lastLoginAt: {
        lt: inactiveThreshold,
      },
      emailVerified: true,
    },
  });

  return {
    reportType: "VULNERABILITY_ASSESSMENT",
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      suspiciousIPs: suspiciousIPs.length,
      policyViolations,
      unauthorizedAccessAttempts: unauthorizedAccess,
      excessivePermissions: excessivePermissions.length,
      inactiveAccounts,
    },
    suspiciousIPs,
    excessivePermissions,
    recommendations: [
      ...(suspiciousIPs.length > 0
        ? ["Consider blocking suspicious IP addresses"]
        : []),
      ...(excessivePermissions.length > 0
        ? ["Review and reduce excessive user permissions"]
        : []),
      ...(inactiveAccounts > 0
        ? ["Review and deactivate inactive user accounts"]
        : []),
    ],
  };
}

/**
 * Generate security incident report
 */
export async function generateSecurityIncidentReport(options?: {
  startDate?: Date;
  endDate?: Date;
  severity?: string;
  category?: string;
}): Promise<any> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  const where: any = {
    detectedAt: { gte: startDate, lte: endDate },
  };

  if (options?.severity) where.severity = options.severity;
  if (options?.category) where.category = options.category;

  const incidents = await prisma.securityIncident.findMany({
    where,
    include: {
      // Include related user if exists
    },
    orderBy: { detectedAt: "desc" },
  });

  // Get incident statistics
  const { getIncidentStatistics } = await import("@/lib/dashboard/incident-response");
  const statistics = await getIncidentStatistics({ startDate, endDate });

  // Group by category
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const incident of incidents) {
    byCategory[incident.category] = (byCategory[incident.category] || 0) + 1;
    bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
    byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;
  }

  return {
    reportType: "SECURITY_INCIDENT",
    period: {
      start: startDate,
      end: endDate,
    },
    summary: statistics,
    byCategory: Object.entries(byCategory).map(([category, count]) => ({
      category,
      count,
    })),
    bySeverity: Object.entries(bySeverity).map(([severity, count]) => ({
      severity,
      count,
    })),
    byStatus: Object.entries(byStatus).map(([status, count]) => ({
      status,
      count,
    })),
    incidents: incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      severity: incident.severity,
      category: incident.category,
      status: incident.status,
      detectedAt: incident.detectedAt,
      resolvedAt: incident.resolvedAt,
      resolutionTime: incident.resolvedAt && incident.detectedAt
        ? (incident.resolvedAt.getTime() - incident.detectedAt.getTime()) / (1000 * 60 * 60) // hours
        : null,
    })),
  };
}

/**
 * Generate risk assessment report
 */
export async function generateRiskAssessmentReport(options?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<any> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  // Get various risk indicators
  const [threats, incidents, violations, failedLogins] = await Promise.all([
    prisma.threatIntelligence.count({
      where: {
        status: "ACTIVE",
        detectedAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.securityIncident.count({
      where: {
        detectedAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.auditLog.count({
      where: {
        logType: "POLICY_VIOLATION",
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.auditLog.count({
      where: {
        logType: "AUTH_FAILURE",
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  // Calculate risk score (0-100)
  let riskScore = 0;
  riskScore += Math.min(threats * 5, 30); // Threats contribute up to 30 points
  riskScore += Math.min(incidents * 10, 30); // Incidents contribute up to 30 points
  riskScore += Math.min(violations * 2, 20); // Violations contribute up to 20 points
  riskScore += Math.min(failedLogins / 10, 20); // Failed logins contribute up to 20 points

  const riskLevel =
    riskScore >= 70
      ? "HIGH"
      : riskScore >= 40
      ? "MEDIUM"
      : "LOW";

  // Get critical risks
  const criticalThreats = await prisma.threatIntelligence.findMany({
    where: {
      severity: "CRITICAL",
      status: { in: ["ACTIVE", "INVESTIGATING"] },
    },
    take: 10,
  });

  const criticalIncidents = await prisma.securityIncident.findMany({
    where: {
      severity: "CRITICAL",
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    take: 10,
  });

  return {
    reportType: "RISK_ASSESSMENT",
    period: {
      start: startDate,
      end: endDate,
    },
    riskScore: Math.round(riskScore * 100) / 100,
    riskLevel,
    indicators: {
      activeThreats: threats,
      securityIncidents: incidents,
      policyViolations: violations,
      failedLoginAttempts: failedLogins,
    },
    criticalRisks: {
      threats: criticalThreats,
      incidents: criticalIncidents,
    },
    recommendations: [
      ...(riskScore >= 70
        ? [
            "Immediate action required: High risk level detected",
            "Review and address all critical threats and incidents",
            "Consider implementing additional security controls",
          ]
        : []),
      ...(threats > 10
        ? ["Review threat intelligence and implement blocking measures"]
        : []),
      ...(incidents > 5
        ? ["Review incident response procedures and improve detection"]
        : []),
    ],
  };
}



