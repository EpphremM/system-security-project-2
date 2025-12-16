import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { backupType } = body;

    
    const backupLog = await prisma.backupLog.create({
      data: {
        backupType: backupType || "FULL",
        backupName: `Manual backup - ${new Date().toISOString()}`,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        startedById: session.user.id,
      },
    });

    // In a real implementation, this would trigger the actual backup process
    // For now, we'll simulate it by updating the status after a delay
    setTimeout(async () => {
      await prisma.backupLog.update({
        where: { id: backupLog.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          verified: true,
        },
      });
    }, 2000);

    return NextResponse.json({
      success: true,
      message: "Backup started",
      backupId: backupLog.id,
    });
  } catch (error) {
    console.error("Perform backup error:", error);
    return NextResponse.json(
      { error: "Failed to start backup" },
      { status: 500 }
    );
  }
}
