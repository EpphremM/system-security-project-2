import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get recent backups
    const backups = await prisma.backupLog.findMany({
      orderBy: {
        startedAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        backupType: true,
        backupName: true,
        status: true,
        size: true,
        createdAt: true,
        completedAt: true,
        verified: true,
        restorationTested: true,
      },
    });

    // Get last backup
    const lastBackup = await prisma.backupLog.findFirst({
      where: {
        status: "COMPLETED",
      },
      orderBy: {
        completedAt: "desc",
      },
      select: {
        completedAt: true,
      },
    });

    // Calculate next backup (assuming daily at 2 AM)
    const now = new Date();
    const nextBackup = new Date(now);
    nextBackup.setHours(2, 0, 0, 0);
    if (nextBackup <= now) {
      nextBackup.setDate(nextBackup.getDate() + 1);
    }

    return NextResponse.json({
      backups: backups.map((b) => ({
        ...b,
        createdAt: b.createdAt.toISOString(),
        completedAt: b.completedAt?.toISOString(),
      })),
      lastBackup: lastBackup?.completedAt?.toISOString() || null,
      nextBackup: nextBackup.toISOString(),
    });
  } catch (error) {
    console.error("Get backup status error:", error);
    return NextResponse.json({
      backups: [],
      lastBackup: null,
      nextBackup: null,
    });
  }
}



