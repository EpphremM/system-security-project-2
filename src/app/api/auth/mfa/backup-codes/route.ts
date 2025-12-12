import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateBackupCodes,
  hashBackupCode,
} from "@/lib/utils/mfa/totp";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.mfaEnabled) {
      return NextResponse.json(
        { error: "MFA not enabled" },
        { status: 400 }
      );
    }

    // Generate new backup codes
    const backupCodes = await generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => hashBackupCode(code))
    );

    // Delete old unused backup codes
    await prisma.mFABackupCode.deleteMany({
      where: {
        userId: session.user.id,
        used: false,
      },
    });

    // Store new backup codes
    await prisma.mFABackupCode.createMany({
      data: hashedBackupCodes.map((hashedCode) => ({
        userId: session.user.id,
        code: hashedCode,
      })),
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "mfa.backup_codes_regenerated",
        resource: "user",
        resourceId: session.user.id,
        securityLabel: "INTERNAL",
      },
    });

    return NextResponse.json({
      success: true,
      backupCodes, // Return plain codes only once - user must save them
      message: "Backup codes generated successfully",
    });
  } catch (error) {
    console.error("Backup codes error:", error);
    return NextResponse.json(
      { error: "Failed to generate backup codes" },
      { status: 500 }
    );
  }
}

/**
 * Get remaining unused backup codes count
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const count = await prisma.mFABackupCode.count({
      where: {
        userId: session.user.id,
        used: false,
      },
    });

    return NextResponse.json({
      remaining: count,
    });
  } catch (error) {
    console.error("Backup codes count error:", error);
    return NextResponse.json(
      { error: "Failed to get backup codes count" },
      { status: 500 }
    );
  }
}



