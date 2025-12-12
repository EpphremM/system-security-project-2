import { prisma } from "@/lib/prisma";
import { LogCategory, LogType, SecurityLevel } from "@/generated/prisma/enums";
import { extractClientMetadata } from "@/lib/utils/bot-prevention";

/**
 * Log subject access request (GDPR, etc.)
 */
export async function logSubjectAccessRequest(
  subjectRequestId: string,
  userId: string,
  requestType: "ACCESS" | "DELETION" | "PORTABILITY" | "RECTIFICATION",
  requestedData: string[],
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "COMPLIANCE",
      logType: "SUBJECT_ACCESS_REQUEST",
      action: "subject_access_request",
      resource: "subject_request",
      resourceId: subjectRequestId,
      details: {
        requestType,
        requestedData,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "CONFIDENTIAL",
      complianceTags: ["GDPR", "SUBJECT_REQUEST"],
      subjectRequestId,
    },
  });
}

/**
 * Log data retention enforcement
 */
export async function logDataRetentionEnforced(
  resource: string,
  resourceId: string,
  retentionPolicy: string,
  action: "DELETED" | "ARCHIVED" | "ANONYMIZED",
  recordCount: number
) {
  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "COMPLIANCE",
      logType: "DATA_RETENTION_ENFORCED",
      action: "retention_policy_enforced",
      resource,
      resourceId,
      details: {
        retentionPolicy,
        action,
        recordCount,
      },
      securityLabel: "CONFIDENTIAL",
      complianceTags: ["DATA_RETENTION", "GDPR"],
    },
  });
}

/**
 * Log data deletion due to retention
 */
export async function logDataDeletedRetention(
  resource: string,
  resourceIds: string[],
  retentionPolicy: string,
  deletedCount: number
) {
  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "COMPLIANCE",
      logType: "DATA_DELETED_RETENTION",
      action: "data_deleted_retention",
      resource,
      details: {
        resourceIds,
        retentionPolicy,
        deletedCount,
      },
      securityLabel: "CONFIDENTIAL",
      complianceTags: ["DATA_RETENTION", "GDPR", "DATA_DELETION"],
    },
  });
}

/**
 * Log audit export
 */
export async function logAuditExport(
  exportedBy: string,
  exportFormat: "CSV" | "JSON" | "PDF" | "XML",
  dateRange: { start: Date; end: Date },
  filters: Record<string, any>,
  recordCount: number,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  const log = await prisma.auditLog.create({
    data: {
      userId: exportedBy,
      category: "COMPLIANCE",
      logType: "AUDIT_EXPORT",
      action: "audit_exported",
      resource: "audit_log",
      details: {
        exportFormat,
        dateRange,
        filters,
        recordCount,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "CONFIDENTIAL",
      complianceTags: ["AUDIT_EXPORT"],
      exportedAt: new Date(),
      exportedBy,
      exportFormat,
    },
  });

  return log;
}

/**
 * Log compliance check
 */
export async function logComplianceCheck(
  checkType: "GDPR" | "HIPAA" | "SOX" | "PCI_DSS" | "CUSTOM",
  checkName: string,
  status: "PASS" | "FAIL" | "WARNING",
  details: Record<string, any>,
  performedBy?: string
) {
  const complianceTags = [checkType];
  if (checkType === "GDPR") {
    complianceTags.push("GDPR");
  } else if (checkType === "HIPAA") {
    complianceTags.push("HIPAA");
  } else if (checkType === "SOX") {
    complianceTags.push("SOX");
  } else if (checkType === "PCI_DSS") {
    complianceTags.push("PCI_DSS");
  }

  return await prisma.auditLog.create({
    data: {
      userId: performedBy || null,
      category: "COMPLIANCE",
      logType: "COMPLIANCE_CHECK",
      action: "compliance_check",
      resource: "compliance",
      details: {
        checkType,
        checkName,
        status,
        ...details,
      },
      securityLabel: "CONFIDENTIAL",
      complianceTags,
    },
  });
}

/**
 * Log GDPR-specific request
 */
export async function logGDPRRequest(
  requestId: string,
  userId: string,
  requestType: "ACCESS" | "DELETION" | "PORTABILITY" | "RECTIFICATION" | "OBJECTION",
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED",
  details: Record<string, any>,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "COMPLIANCE",
      logType: "GDPR_REQUEST",
      action: "gdpr_request",
      resource: "gdpr_request",
      resourceId: requestId,
      details: {
        requestType,
        status,
        ...details,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "CONFIDENTIAL",
      complianceTags: ["GDPR"],
      subjectRequestId: requestId,
    },
  });
}

/**
 * Log HIPAA audit event
 */
export async function logHIPAAAudit(
  eventType: string,
  userId: string,
  resource: string,
  resourceId: string,
  details: Record<string, any>,
  request?: Request
) {
  const metadata = request ? extractClientMetadata(request) : {};

  return await prisma.auditLog.create({
    data: {
      userId,
      category: "COMPLIANCE",
      logType: "HIPAA_AUDIT",
      action: "hipaa_audit",
      resource,
      resourceId,
      details: {
        eventType,
        ...details,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      location: metadata.location,
      securityLabel: "CONFIDENTIAL",
      complianceTags: ["HIPAA"],
    },
  });
}

/**
 * Calculate retention date based on compliance requirements
 */
export function calculateRetentionDate(
  complianceTags: string[],
  defaultRetentionDays: number = 2555 // 7 years default
): Date {
  const retentionDays: Record<string, number> = {
    GDPR: 2555, // 7 years
    HIPAA: 2190, // 6 years
    SOX: 2555, // 7 years
    PCI_DSS: 1095, // 3 years
    SECURITY_CLEARANCE: 2555, // 7 years
    DATA_DELETION: 365, // 1 year
    AUDIT_EXPORT: 2555, // 7 years
  };

  // Use the longest retention period from applicable tags
  let maxRetention = defaultRetentionDays;
  for (const tag of complianceTags) {
    if (retentionDays[tag] && retentionDays[tag] > maxRetention) {
      maxRetention = retentionDays[tag];
    }
  }

  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() + maxRetention);
  return retentionDate;
}



