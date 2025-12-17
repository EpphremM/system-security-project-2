import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get("id");

    if (!backupId) {
      return NextResponse.json(
        { error: "Backup ID is required" },
        { status: 400 }
      );
    }

    const backup = await prisma.backupLog.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      );
    }

    if (backup.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Backup is not completed" },
        { status: 400 }
      );
    }

    const backupPath = backup.primaryPath || backup.backupPath;
    if (!backupPath) {
      return NextResponse.json(
        { error: "Backup file not found" },
        { status: 404 }
      );
    }

    if (!existsSync(backupPath)) {
      return NextResponse.json(
        { error: "Backup file does not exist on disk" },
        { status: 404 }
      );
    }

    try {
      const fileBuffer = await readFile(backupPath);
      const fileName = path.basename(backupPath);

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    } catch (error) {
      console.error("Error reading backup file:", error);
      return NextResponse.json(
        { error: "Failed to read backup file" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Download backup error:", error);
    return NextResponse.json(
      { error: "Failed to download backup" },
      { status: 500 }
    );
  }
}

