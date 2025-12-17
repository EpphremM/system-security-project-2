import { prisma } from "@/lib/prisma";
import { ReportType, ReportFormat, ReportGenerationStatus } from "@/generated/prisma/enums";
import * as complianceReports from "./compliance";
import * as securityReports from "./security";
import * as operationalReports from "./operational";


export async function generateReport(
  reportType: ReportType,
  options?: {
    startDate?: Date;
    endDate?: Date;
    filters?: Record<string, any>;
  }
): Promise<any> {
  switch (reportType) {
    
    case "ACCESS_CONTROL_REVIEW":
      return await complianceReports.generateAccessControlReviewReport(options);
    case "USER_PERMISSION":
      return await complianceReports.generateUserPermissionReport(options);
    case "DATA_ACCESS_AUDIT":
      return await complianceReports.generateDataAccessAuditTrailReport(options);
    case "POLICY_COMPLIANCE":
      return await complianceReports.generatePolicyComplianceReport(options);

    
    case "THREAT_INTELLIGENCE":
      return await securityReports.generateThreatIntelligenceReport(options);
    case "VULNERABILITY_ASSESSMENT":
      return await securityReports.generateVulnerabilityAssessmentReport(options);
    case "SECURITY_INCIDENT":
      return await securityReports.generateSecurityIncidentReport(options);
    case "RISK_ASSESSMENT":
      return await securityReports.generateRiskAssessmentReport(options);

    
    case "VISITOR_STATISTICS":
      return await operationalReports.generateVisitorStatisticsReport(options);
    case "SYSTEM_PERFORMANCE":
      return await operationalReports.generateSystemPerformanceReport(options);
    case "BACKUP_SUCCESS":
      return await operationalReports.generateBackupSuccessReport(options);
    case "USER_ACTIVITY":
      return await operationalReports.generateUserActivitySummaryReport(options);

    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}


export async function saveReport(
  reportType: ReportType,
  reportData: any,
  generatedBy: string,
  options?: {
    format?: ReportFormat;
    templateId?: string;
    scheduleId?: string;
    startDate?: Date;
    endDate?: Date;
    filters?: Record<string, any>;
  }
): Promise<string> {
  const report = await prisma.report.create({
    data: {
      reportType,
      reportName: `${reportType}_${new Date().toISOString()}`,
      reportData,
      filters: options?.filters || {},
      format: options?.format || "JSON",
      generatedBy,
      startDate: options?.startDate,
      endDate: options?.endDate,
      status: "COMPLETED" as ReportGenerationStatus,
      templateId: options?.templateId,
      scheduleId: options?.scheduleId,
    },
  });

  return report.id;
}


export async function generateAndSaveReport(
  reportType: ReportType,
  generatedBy: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    filters?: Record<string, any>;
    format?: ReportFormat;
    templateId?: string;
    scheduleId?: string;
  }
): Promise<string> {
  

  const reportData = await generateReport(reportType, {
    startDate: options?.startDate,
    endDate: options?.endDate,
    filters: options?.filters,
  });

  

  const reportId = await saveReport(reportType, reportData, generatedBy, {
    format: options?.format,
    templateId: options?.templateId,
    scheduleId: options?.scheduleId,
    startDate: options?.startDate,
    endDate: options?.endDate,
    filters: options?.filters,
  });

  return reportId;
}


export async function exportReport(
  reportId: string,
  format: ReportFormat
): Promise<{
  content: string | Buffer;
  mimeType: string;
  filename: string;
}> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error("Report not found");
  }

  const reportData = report.reportData as any;

  switch (format) {
    case "JSON":
      return {
        content: JSON.stringify(reportData, null, 2),
        mimeType: "application/json",
        filename: `${report.reportName}.json`,
      };

    case "CSV":
      const csv = convertToCSV(reportData);
      return {
        content: csv,
        mimeType: "text/csv",
        filename: `${report.reportName}.csv`,
      };

    case "HTML":
      const html = convertToHTML(reportData);
      return {
        content: html,
        mimeType: "text/html",
        filename: `${report.reportName}.html`,
      };

    case "PDF":
      

      

      const htmlForPDF = convertToHTML(reportData);
      return {
        content: htmlForPDF,
        mimeType: "application/pdf",
        filename: `${report.reportName}.pdf`,
      };

    case "EXCEL":
      

      

      const csvForExcel = convertToCSV(reportData);
      return {
        content: csvForExcel,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `${report.reportName}.xlsx`,
      };

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}


function convertToCSV(data: any): string {
  if (Array.isArray(data)) {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((header) => JSON.stringify(row[header] || "")).join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  }

  

  const lines: string[] = [];
  function flatten(obj: any, prefix = ""): void {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        flatten(value, newKey);
      } else {
        lines.push(`${newKey},${JSON.stringify(value)}`);
      }
    }
  }
  flatten(data);
  return lines.join("\n");
}


function convertToHTML(data: any): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Report</h1>
  <div class="summary">
    ${JSON.stringify(data, null, 2).replace(/\n/g, "<br>")}
  </div>
</body>
</html>
  `;
  return html;
}


export async function getReport(reportId: string): Promise<any> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error("Report not found");
  }

  return report;
}


export async function listReports(options?: {
  reportType?: ReportType;
  startDate?: Date;
  endDate?: Date;
  generatedBy?: string;
  limit?: number;
}): Promise<any[]> {
  const where: any = {};

  if (options?.reportType) where.reportType = options.reportType;
  if (options?.generatedBy) where.generatedBy = options.generatedBy;
  if (options?.startDate || options?.endDate) {
    where.generatedAt = {};
    if (options.startDate) where.generatedAt.gte = options.startDate;
    if (options.endDate) where.generatedAt.lte = options.endDate;
  }

  const reports = await prisma.report.findMany({
    where,
    orderBy: { generatedAt: "desc" },
    take: options?.limit || 100,
  });

  return reports;
}

