import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { encryptLogData } from "@/lib/logging/encryption";
import { z } from "zod";

const encryptSchema = z.object({
  logId: z.string().uuid(),
  data: z.string(),
});

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
    const parsed = encryptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { logId, data } = parsed.data;

    // Get log to determine category
    const { prisma } = await import("@/lib/prisma");
    const log = await prisma.auditLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      return NextResponse.json(
        { error: "Log not found" },
        { status: 404 }
      );
    }

    // Encrypt data
    const encrypted = await encryptLogData(data, log.category);

    // Update log with encrypted data
    await prisma.auditLog.update({
      where: { id: logId },
      data: {
        encryptedDetails: JSON.stringify(encrypted),
        encryptionKeyId: encrypted.keyId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Log data encrypted successfully",
    });
  } catch (error) {
    console.error("Encrypt log error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to encrypt log" },
      { status: 500 }
    );
  }
}



