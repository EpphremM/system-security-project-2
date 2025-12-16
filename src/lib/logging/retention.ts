import { prisma } from "@/lib/prisma";
import { calculateRetentionDate, logDataDeletedRetention } from "./compliance";


export async function enforceRetentionPolicies() {
  
  const expiredLogs = await prisma.auditLog.findMany({
    where: {
      retentionUntil: {
        lte: new Date(),
      },
    },
    select: {
      id: true,
      category: true,
      resource: true,
      complianceTags: true,
    },
  });

  if (expiredLogs.length === 0) {
    return {
      success: true,
      deletedCount: 0,
    };
  }

  
  const resourceGroups: Record<string, string[]> = {};
  for (const log of expiredLogs) {
    if (!resourceGroups[log.resource]) {
      resourceGroups[log.resource] = [];
    }
    resourceGroups[log.resource].push(log.id);
  }

  
  const deleteResult = await prisma.auditLog.deleteMany({
    where: {
      id: {
        in: expiredLogs.map((log) => log.id),
      },
    },
  });

  
  for (const [resource, resourceIds] of Object.entries(resourceGroups)) {
    await logDataDeletedRetention(
      resource,
      resourceIds,
      "RETENTION_POLICY",
      resourceIds.length
    );
  }

  return {
    success: true,
    deletedCount: deleteResult.count,
  };
}


export async function updateRetentionDates() {
  
  const logsWithoutRetention = await prisma.auditLog.findMany({
    where: {
      retentionUntil: null,
    },
    select: {
      id: true,
      complianceTags: true,
    },
  });

  let updatedCount = 0;

  for (const log of logsWithoutRetention) {
    const retentionDate = calculateRetentionDate(log.complianceTags || []);
    await prisma.auditLog.update({
      where: { id: log.id },
      data: { retentionUntil: retentionDate },
    });
    updatedCount++;
  }

  return {
    success: true,
    updatedCount,
  };
}


export async function setRetentionDate(
  logId: string,
  retentionDate: Date
) {
  return await prisma.auditLog.update({
    where: { id: logId },
    data: { retentionUntil: retentionDate },
  });
}



