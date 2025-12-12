import { prisma } from "@/lib/prisma";
import { AlertSeverity, AlertCategory } from "@/generated/prisma/enums";
import { aggregateLogs, getLogStatistics } from "@/lib/logging/aggregation";
import { getRecentAnomalies } from "@/lib/logging/anomaly-detection";

/**
 * Generate dashboard alerts
 */
export async function generateDashboardAlerts(): Promise<{
  alerts: any[];
  count: number;
}> {
  const alerts: any[] = [];
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Unusual access patterns
  const unusualAccess = await detectUnusualAccessPatterns(last24Hours);
  if (unusualAccess) {
    alerts.push(unusualAccess);
  }

  // 2. Policy violation trends
  const policyViolations = await detectPolicyViolationTrends(last7Days);
  if (policyViolations) {
    alerts.push(policyViolations);
  }

  // 3. Performance degradation
  const performance = await detectPerformanceDegradation(last24Hours);
  if (performance) {
    alerts.push(performance);
  }

  // 4. Compliance gaps
  const compliance = await detectComplianceGaps(last7Days);
  if (compliance) {
    alerts.push(compliance);
  }

  // Save alerts to database
  for (const alert of alerts) {
    await prisma.dashboardAlert.create({
      data: alert,
    });
  }

  return {
    alerts,
    count: alerts.length,
  };
}

/**
 * Detect unusual access patterns
 */
async function detectUnusualAccessPatterns(
  since: Date
): Promise<any | null> {
  const stats = await getLogStatistics(since, new Date(), "USER_ACTIVITY");

  // Check for unusual patterns
  const unusualPatterns: string[] = [];

  // High number of access denials
  if (stats.accessDenied > 50) {
    unusualPatterns.push(`High number of access denials: ${stats.accessDenied}`);
  }

  // Unusual user activity
  const aggregation = await aggregateLogs("USER_ACTIVITY", 3600); // Last hour
  const topUser = Object.entries(aggregation.byUser).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (topUser && topUser[1] > 100) {
    unusualPatterns.push(
      `Unusual activity from user: ${topUser[0]} (${topUser[1]} actions)`
    );
  }

  if (unusualPatterns.length === 0) {
    return null;
  }

  return {
    alertType: "UNUSUAL_ACCESS_PATTERN",
    severity: unusualPatterns.length > 2 ? "HIGH" : "MEDIUM",
    title: "Unusual Access Patterns Detected",
    message: unusualPatterns.join("\n"),
    category: "SECURITY",
    data: {
      stats,
      aggregation,
    },
    startDate: since,
    endDate: new Date(),
    active: true,
  };
}

/**
 * Detect policy violation trends
 */
async function detectPolicyViolationTrends(
  since: Date
): Promise<any | null> {
  const stats = await getLogStatistics(since, new Date(), "SECURITY");

  // Count policy violations
  const { prisma } = await import("@/lib/prisma");
  const violations = await prisma.auditLog.count({
    where: {
      logType: "POLICY_VIOLATION",
      createdAt: {
        gte: since,
      },
    },
  });

  if (violations === 0) {
    return null;
  }

  const severity = violations > 20 ? "HIGH" : violations > 10 ? "MEDIUM" : "LOW";

  return {
    alertType: "POLICY_VIOLATION_TREND",
    severity,
    title: "Policy Violation Trend Detected",
    message: `Policy violations detected: ${violations} in the last 7 days.\n\nThis indicates a potential security issue that requires attention.`,
    category: "SECURITY",
    data: {
      violations,
      period: "7 days",
    },
    startDate: since,
    endDate: new Date(),
    active: true,
  };
}

/**
 * Detect performance degradation
 */
async function detectPerformanceDegradation(
  since: Date
): Promise<any | null> {
  const stats = await getLogStatistics(since, new Date(), "SYSTEM");

  // Check average response time
  if (stats.averageResponseTime > 1000) {
    // More than 1 second
    return {
      alertType: "PERFORMANCE_DEGRADATION",
      severity: stats.averageResponseTime > 5000 ? "HIGH" : "MEDIUM",
      title: "Performance Degradation Detected",
      message: `Average response time: ${stats.averageResponseTime}ms\n\nThis exceeds acceptable thresholds and may impact user experience.`,
      category: "PERFORMANCE",
      data: {
        averageResponseTime: stats.averageResponseTime,
        threshold: 1000,
      },
      startDate: since,
      endDate: new Date(),
      active: true,
    };
  }

  return null;
}

/**
 * Detect compliance gaps
 */
async function detectComplianceGaps(since: Date): Promise<any | null> {
  const { prisma } = await import("@/lib/prisma");

  // Check for missing compliance logs
  const complianceLogs = await prisma.auditLog.count({
    where: {
      category: "COMPLIANCE",
      createdAt: {
        gte: since,
      },
    },
  });

  // Check for unresolved anomalies
  const unresolvedAnomalies = await getRecentAnomalies(100, "HIGH");
  const criticalAnomalies = unresolvedAnomalies.filter(
    (a: any) => a.severity === "CRITICAL" || a.severity === "HIGH"
  );

  if (criticalAnomalies.length > 0) {
    return {
      alertType: "COMPLIANCE_GAP",
      severity: "HIGH",
      title: "Compliance Gaps Detected",
      message: `Critical compliance issues detected:\n\n- Unresolved anomalies: ${criticalAnomalies.length}\n- Compliance logs: ${complianceLogs}\n\nImmediate review required.`,
      category: "COMPLIANCE",
      data: {
        unresolvedAnomalies: criticalAnomalies.length,
        complianceLogs,
      },
      startDate: since,
      endDate: new Date(),
      active: true,
    };
  }

  return null;
}

/**
 * Get active dashboard alerts
 */
export async function getActiveDashboardAlerts(
  limit: number = 50
): Promise<any[]> {
  return await prisma.dashboardAlert.findMany({
    where: {
      active: true,
      dismissed: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

/**
 * Dismiss dashboard alert
 */
export async function dismissDashboardAlert(
  alertId: string,
  dismissedBy: string
): Promise<void> {
  await prisma.dashboardAlert.update({
    where: { id: alertId },
    data: {
      dismissed: true,
      dismissedBy,
      dismissedAt: new Date(),
    },
  });
}



