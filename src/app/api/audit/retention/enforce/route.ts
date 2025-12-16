import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logDataDeletedRetention, calculateRetentionDate } from "@/lib/logging/compliance";


export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    
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
      return NextResponse.json({
        success: true,
        message: "No logs to delete",
        deletedCount: 0,
      });
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

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleteResult.count} expired logs`,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error("Enforce retention error:", error);
    return NextResponse.json(
      { error: "Failed to enforce retention policies" },
      { status: 500 }
    );
  }
}

/**
 * Update retention dates for logs based on compliance tags
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find logs without retention dates
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

    return NextResponse.json({
      success: true,
      message: `Updated retention dates for ${updatedCount} logs`,
      updatedCount,
    });
  } catch (error) {
    console.error("Update retention dates error:", error);
    return NextResponse.json(
      { error: "Failed to update retention dates" },
      { status: 500 }
    );
  }
}



