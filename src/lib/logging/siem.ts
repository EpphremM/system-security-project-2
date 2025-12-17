import { prisma } from "@/lib/prisma";
import { LogCategory } from "@/generated/prisma/enums";
import { encryptLogData } from "./encryption";


export async function syncToSIEM(
  siemId: string,
  logIds?: string[]
): Promise<{
  success: boolean;
  synced: number;
  failed: number;
}> {
  const siem = await prisma.sIEMIntegration.findUnique({
    where: { id: siemId },
  });

  if (!siem || !siem.enabled) {
    throw new Error("SIEM integration not found or disabled");
  }

  
  const where: any = {};
  if (logIds) {
    where.id = { in: logIds };
  } else {
    
    where.createdAt = siem.lastSyncAt
      ? { gt: siem.lastSyncAt }
      : { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }; 
  }

  
  if (siem.filters) {
    const filters = siem.filters as any;
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.logType) {
      where.logType = filters.logType;
    }
    if (filters.securityLabel) {
      where.securityLabel = filters.securityLabel;
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "asc" },
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

  let synced = 0;
  let failed = 0;

  
  for (const log of logs) {
    try {
      const formatted = formatLogForSIEM(log, siem.type);
      await sendToSIEM(siem.endpoint, formatted, siem.apiKey);
      synced++;
    } catch (error) {
      console.error(`Failed to sync log ${log.id} to SIEM:`, error);
      failed++;
    }
  }

  

  if (synced > 0) {
    await prisma.sIEMIntegration.update({
      where: { id: siemId },
      data: { lastSyncAt: new Date() },
    });
  }

  return {
    success: failed === 0,
    synced,
    failed,
  };
}


function formatLogForSIEM(log: any, siemType: string): any {
  const baseFormat = {
    id: log.id,
    timestamp: log.createdAt.toISOString(),
    category: log.category,
    logType: log.logType,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId,
    userId: log.userId,
    userEmail: log.user?.email,
    userName: log.user?.name,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    location: log.location,
    accessGranted: log.accessGranted,
    policyId: log.policyId,
    policyType: log.policyType,
    denialReason: log.denialReason,
    securityLabel: log.securityLabel,
    complianceTags: log.complianceTags,
    isTampered: log.isTampered,
    details: log.details,
  };

  

  switch (siemType) {
    case "SPLUNK":
      return {
        ...baseFormat,
        _time: log.createdAt.toISOString(),
        sourcetype: "audit_log",
        source: "css_system",
      };

    case "ELK":
      return {
        ...baseFormat,
        "@timestamp": log.createdAt.toISOString(),
        type: "audit_log",
      };

    case "QRADAR":
      return {
        ...baseFormat,
        startTime: log.createdAt.getTime(),
        category: log.category,
        qid: log.logType,
      };

    default:
      return baseFormat;
  }
}


async function sendToSIEM(
  endpoint: string,
  data: any,
  apiKey?: string
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`SIEM sync failed: ${response.statusText}`);
  }
}


export async function createSIEMIntegration(
  name: string,
  type: string,
  endpoint: string,
  apiKey?: string,
  filters?: any
): Promise<any> {
  

  let encryptedApiKey: string | undefined;
  if (apiKey) {
    const encrypted = await encryptLogData(apiKey, "SYSTEM");
    encryptedApiKey = JSON.stringify(encrypted);
  }

  return await prisma.sIEMIntegration.create({
    data: {
      name,
      type,
      endpoint,
      apiKey: encryptedApiKey,
      filters,
      enabled: true,
    },
  });
}


export async function getSIEMIntegrations(): Promise<any[]> {
  return await prisma.sIEMIntegration.findMany({
    where: { enabled: true },
    select: {
      id: true,
      name: true,
      type: true,
      endpoint: true,
      enabled: true,
      lastSyncAt: true,
      syncInterval: true,
      createdAt: true,
      

    },
  });
}


export async function autoSyncSIEM(): Promise<{
  synced: number;
  failed: number;
}> {
  const siems = await prisma.sIEMIntegration.findMany({
    where: { enabled: true },
  });

  let totalSynced = 0;
  let totalFailed = 0;

  for (const siem of siems) {
    try {
      const result = await syncToSIEM(siem.id);
      totalSynced += result.synced;
      totalFailed += result.failed;
    } catch (error) {
      console.error(`Failed to sync SIEM ${siem.name}:`, error);
      totalFailed++;
    }
  }

  return {
    synced: totalSynced,
    failed: totalFailed,
  };
}



