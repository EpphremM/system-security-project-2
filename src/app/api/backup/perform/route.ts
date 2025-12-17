import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { performFullBackup, performIncrementalBackup } from "@/lib/backup/automated";

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

    let backupId: string;

    try {
      if (backupType === "INCREMENTAL") {
        backupId = await performIncrementalBackup(session.user.id);
      } else {
        backupId = await performFullBackup(session.user.id);
      }

      return NextResponse.json({
        success: true,
        message: "Backup completed successfully",
        backupId,
      });
    } catch (error) {
      console.error("Backup error:", error);
      return NextResponse.json(
        { 
          error: "Failed to perform backup",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Perform backup error:", error);
    return NextResponse.json(
      { error: "Failed to start backup" },
      { status: 500 }
    );
  }
}
