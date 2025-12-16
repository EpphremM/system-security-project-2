import { prisma } from "@/lib/prisma";
import { LogCategory, LogType, SecurityLevel } from "@/generated/prisma/enums";

interface SystemLogOptions {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  duration?: number;
  performanceMetrics?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  stackTrace?: string;
  securityLabel?: SecurityLevel;
}


export async function logAppStart(version: string, environment: string) {
  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "SYSTEM",
      logType: "APP_START",
      action: "application_started",
      resource: "application",
      details: {
        version,
        environment,
      },
      securityLabel: "INTERNAL",
    },
  });
}


export async function logAppStop(reason: string) {
  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "SYSTEM",
      logType: "APP_STOP",
      action: "application_stopped",
      resource: "application",
      details: {
        reason,
      },
      securityLabel: "INTERNAL",
    },
  });
}


export async function logAppError(
  error: Error,
  context?: Record<string, any>
) {
  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "SYSTEM",
      logType: "APP_ERROR",
      action: "application_error",
      resource: "application",
      details: context,
      errorCode: error.name,
      errorMessage: error.message,
      stackTrace: error.stack,
      securityLabel: "INTERNAL",
    },
  });
}


export async function logBackupStart(
  backupId: string,
  backupType: string,
  backupName: string,
  createdBy?: string
) {
  return await prisma.auditLog.create({
    data: {
      userId: createdBy || null,
      category: "SYSTEM",
      logType: "BACKUP_START",
      action: "backup_started",
      resource: "backup",
      resourceId: backupId,
      details: {
        backupType,
        backupName,
      },
      securityLabel: "CONFIDENTIAL",
    },
  });
}


export async function logBackupComplete(
  backupId: string,
  duration: number,
  size: number,
  recordCount: number,
  checksum?: string
) {
  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "SYSTEM",
      logType: "BACKUP_COMPLETE",
      action: "backup_completed",
      resource: "backup",
      resourceId: backupId,
      details: {
        size,
        recordCount,
        checksum,
      },
      duration,
      securityLabel: "CONFIDENTIAL",
    },
  });
}


export async function logBackupFailed(
  backupId: string,
  errorMessage: string,
  errorCode?: string
) {
  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "SYSTEM",
      logType: "BACKUP_FAILED",
      action: "backup_failed",
      resource: "backup",
      resourceId: backupId,
      details: {
        errorMessage,
      },
      errorCode,
      errorMessage,
      securityLabel: "CONFIDENTIAL",
    },
  });
}


export async function logBackupVerified(
  backupId: string,
  verified: boolean,
  checksum?: string
) {
  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "SYSTEM",
      logType: "BACKUP_VERIFIED",
      action: "backup_verified",
      resource: "backup",
      resourceId: backupId,
      details: {
        verified,
        checksum,
      },
      securityLabel: "CONFIDENTIAL",
    },
  });
}


export async function logPerformanceMetric(
  metricName: string,
  value: number,
  unit: string,
  metadata?: Record<string, any>
) {
  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "SYSTEM",
      logType: "PERFORMANCE_METRIC",
      action: "performance_metric",
      resource: "system",
      details: {
        metricName,
        value,
        unit,
        ...metadata,
      },
      performanceMetrics: {
        [metricName]: {
          value,
          unit,
          ...metadata,
        },
      },
      securityLabel: "INTERNAL",
    },
  });
}


export async function logException(
  exception: Error,
  context?: Record<string, any>
) {
  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "SYSTEM",
      logType: "EXCEPTION",
      action: "exception_occurred",
      resource: "application",
      details: context,
      errorCode: exception.name,
      errorMessage: exception.message,
      stackTrace: exception.stack,
      securityLabel: "INTERNAL",
    },
  });
}


export async function logConfigChange(
  configKey: string,
  oldValue: any,
  newValue: any,
  changedBy?: string
) {
  return await prisma.auditLog.create({
    data: {
      userId: changedBy || null,
      category: "SYSTEM",
      logType: "CONFIG_CHANGE",
      action: "configuration_changed",
      resource: "system_config",
      resourceId: configKey,
      details: {
        configKey,
      },
      beforeState: { value: oldValue },
      afterState: { value: newValue },
      securityLabel: "INTERNAL",
    },
  });
}


export async function logSystemEvent(options: SystemLogOptions) {
  return await prisma.auditLog.create({
    data: {
      userId: null,
      category: "SYSTEM",
      logType: "APP_ERROR", 
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId,
      details: options.details,
      duration: options.duration,
      performanceMetrics: options.performanceMetrics,
      errorCode: options.errorCode,
      errorMessage: options.errorMessage,
      stackTrace: options.stackTrace,
      securityLabel: options.securityLabel || "INTERNAL",
    },
  });
}



