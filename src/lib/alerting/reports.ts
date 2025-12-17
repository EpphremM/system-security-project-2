import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/utils/email";
import {
  ReportType,
  ReportFrequency,
  ReportStatus,
} from "@/generated/prisma/enums";
import { getLogStatistics } from "@/lib/logging/aggregation";
import { getRecentAnomalies } from "@/lib/logging/anomaly-detection";


export async function generateDailySecuritySummary(): Promise<any> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(now);

  
  const securityStats = await getLogStatistics(startDate, endDate, "SECURITY");
  const userActivityStats = await getLogStatistics(
    startDate,
    endDate,
    "USER_ACTIVITY"
  );

  
  const anomalies = await getRecentAnomalies(50);

  
  const { prisma: prismaClient } = await import("@/lib/prisma");
  const failedLogins = await prismaClient.auditLog.count({
    where: {
      logType: "AUTH_FAILURE",
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  
  const accessDenials = await prismaClient.auditLog.count({
    where: {
      accessGranted: false,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return {
    date: startDate.toISOString().split("T")[0],
    summary: {
      totalLogs: securityStats.totalLogs + userActivityStats.totalLogs,
      failedLogins,
      accessDenials,
      anomalies: anomalies.length,
      criticalAnomalies: anomalies.filter((a: any) => a.severity === "CRITICAL").length,
    },
    statistics: {
      security: securityStats,
      userActivity: userActivityStats,
    },
    anomalies: anomalies.slice(0, 10), 
  };
}


export async function generateWeeklyComplianceReport(): Promise<any> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(now);

  
  const complianceStats = await getLogStatistics(
    startDate,
    endDate,
    "COMPLIANCE"
  );

  
  const { prisma: prismaClient } = await import("@/lib/prisma");
  const gdprRequests = await prismaClient.auditLog.count({
    where: {
      complianceTags: { has: "GDPR" },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const hipaaAudits = await prismaClient.auditLog.count({
    where: {
      complianceTags: { has: "HIPAA" },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const dataExports = await prismaClient.auditLog.count({
    where: {
      logType: "DATA_EXPORT",
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return {
    period: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    },
    summary: {
      totalComplianceLogs: complianceStats.totalLogs,
      gdprRequests,
      hipaaAudits,
      dataExports,
    },
    statistics: complianceStats,
  };
}


export async function generateMonthlyAuditReview(): Promise<any> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 1);
  const endDate = new Date(now);

  
  const securityStats = await getLogStatistics(startDate, endDate, "SECURITY");
  const userActivityStats = await getLogStatistics(
    startDate,
    endDate,
    "USER_ACTIVITY"
  );
  const systemStats = await getLogStatistics(startDate, endDate, "SYSTEM");
  const complianceStats = await getLogStatistics(
    startDate,
    endDate,
    "COMPLIANCE"
  );

  
  const { prisma: prismaClient } = await import("@/lib/prisma");
  const tamperedLogs = await prismaClient.auditLog.count({
    where: {
      isTampered: true,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return {
    period: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    },
    summary: {
      totalLogs:
        securityStats.totalLogs +
        userActivityStats.totalLogs +
        systemStats.totalLogs +
        complianceStats.totalLogs,
      tamperedLogs,
      accessGranted: securityStats.accessGranted,
      accessDenied: securityStats.accessDenied,
    },
    statistics: {
      security: securityStats,
      userActivity: userActivityStats,
      system: systemStats,
      compliance: complianceStats,
    },
  };
}


export async function generateQuarterlyRiskAssessment(): Promise<any> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 3);
  const endDate = new Date(now);

  
  const securityStats = await getLogStatistics(startDate, endDate, "SECURITY");
  const userActivityStats = await getLogStatistics(
    startDate,
    endDate,
    "USER_ACTIVITY"
  );
  const systemStats = await getLogStatistics(startDate, endDate, "SYSTEM");
  const complianceStats = await getLogStatistics(
    startDate,
    endDate,
    "COMPLIANCE"
  );

  
  const anomalies = await getRecentAnomalies(1000);

  
  const riskScore = calculateRiskScore(
    securityStats,
    userActivityStats,
    systemStats,
    complianceStats,
    anomalies
  );

  return {
    period: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    },
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    summary: {
      totalLogs:
        securityStats.totalLogs +
        userActivityStats.totalLogs +
        systemStats.totalLogs +
        complianceStats.totalLogs,
      anomalies: anomalies.length,
      criticalAnomalies: anomalies.filter((a: any) => a.severity === "CRITICAL").length,
      tamperedLogs: securityStats.tamperedLogs,
    },
    statistics: {
      security: securityStats,
      userActivity: userActivityStats,
      system: systemStats,
      compliance: complianceStats,
    },
    recommendations: generateRecommendations(riskScore, anomalies),
  };
}


function calculateRiskScore(
  securityStats: any,
  userActivityStats: any,
  systemStats: any,
  complianceStats: any,
  anomalies: any[]
): number {
  let score = 0;

  
  score += Math.min(securityStats.accessDenied / 10, 20);

  
  score += securityStats.tamperedLogs * 10;

  
  const criticalAnomalies = anomalies.filter((a: any) => a.severity === "CRITICAL");
  score += criticalAnomalies.length * 5;

  
  const highAnomalies = anomalies.filter((a: any) => a.severity === "HIGH");
  score += highAnomalies.length * 2;

  
  if (systemStats.averageResponseTime > 5000) {
    score += 10;
  }

  return Math.min(score, 100);
}


function getRiskLevel(score: number): string {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  if (score >= 20) return "LOW";
  return "MINIMAL";
}


function generateRecommendations(riskScore: number, anomalies: any[]): string[] {
  const recommendations: string[] = [];

  if (riskScore >= 80) {
    recommendations.push("Immediate security review required");
    recommendations.push("Consider implementing additional security controls");
  }

  if (anomalies.length > 50) {
    recommendations.push("Review and resolve outstanding anomalies");
  }

  const criticalAnomalies = anomalies.filter((a: any) => a.severity === "CRITICAL");
  if (criticalAnomalies.length > 0) {
    recommendations.push(`Address ${criticalAnomalies.length} critical anomalies immediately`);
  }

  return recommendations;
}


export async function executeScheduledReport(
  reportId: string
): Promise<string> {
  const report = await prisma.scheduledReport.findUnique({
    where: { id: reportId },
  });

  if (!report || !report.enabled) {
    throw new Error("Report not found or disabled");
  }

  

  const execution = await prisma.reportExecution.create({
    data: {
      reportId,
      status: "RUNNING",
    },
  });

  try {
    

    let reportData: any;

    switch (report.reportType) {
      case "DAILY_SECURITY_SUMMARY":
        reportData = await generateDailySecuritySummary();
        break;
      case "WEEKLY_COMPLIANCE":
        reportData = await generateWeeklyComplianceReport();
        break;
      case "MONTHLY_AUDIT_REVIEW":
        reportData = await generateMonthlyAuditReview();
        break;
      case "QUARTERLY_RISK_ASSESSMENT":
        reportData = await generateQuarterlyRiskAssessment();
        break;
      default:
        throw new Error(`Unknown report type: ${report.reportType}`);
    }

    

    const formattedReport = formatReport(reportData, report.format);

    

    for (const recipient of report.recipients) {
      await sendReportEmail(recipient, report.reportType, formattedReport);
    }

    

    await prisma.reportExecution.update({
      where: { id: execution.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        reportData,
      },
    });

    

    const nextRunAt = calculateNextRunTime(report.frequency);
    await prisma.scheduledReport.update({
      where: { id: reportId },
      data: {
        lastRunAt: new Date(),
        nextRunAt,
        lastReportData: reportData,
      },
    });

    return execution.id;
  } catch (error) {
    await prisma.reportExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}


function formatReport(data: any, format: string): string {
  switch (format) {
    case "JSON":
      return JSON.stringify(data, null, 2);
    case "CSV":
      return formatAsCSV(data);
    case "PDF":
      

      return formatAsHTML(data);
    default:
      return JSON.stringify(data, null, 2);
  }
}


function formatAsCSV(data: any): string {
  

  return JSON.stringify(data);
}


function formatAsHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #1f2937; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; }
      </style>
    </head>
    <body>
      <h1>Security Report</h1>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    </body>
    </html>
  `;
}


async function sendReportEmail(
  recipient: string,
  reportType: ReportType,
  reportContent: string
): Promise<void> {
  const subject = `Security Report: ${reportType.replace(/_/g, " ")}`;
  const html = `
    <h1>Security Report</h1>
    <p>Please find the attached security report.</p>
    <pre style="background: #f9fafb; padding: 20px; border-radius: 4px;">${reportContent}</pre>
  `;

  await sendEmail(recipient, subject, html);
}


function calculateNextRunTime(frequency: ReportFrequency): Date {
  const next = new Date();

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      next.setHours(0, 0, 0, 0);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
      break;
  }

  return next;
}



