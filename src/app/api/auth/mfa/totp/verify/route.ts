import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  verifyTOTPCode,
  generateBackupCodes,
  hashBackupCode,
} from "@/lib/utils/mfa/totp";

const verifySchema = z.object({
  secret: z.string(),
  code: z.string().length(6),
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
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { secret, code } = parsed.data;

    
    const isValid = verifyTOTPCode(secret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid TOTP code" },
        { status: 400 }
      );
    }

    
    const backupCodes = await generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => hashBackupCode(code))
    );

    
    await prisma.$transaction(async (tx) => {
      
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          mfaSecret: secret,
          mfaEnabled: true,
        },
      });

      
      await tx.mFABackupCode.createMany({
        data: hashedBackupCodes.map((hashedCode) => ({
          userId: session.user.id,
          code: hashedCode,
        })),
      });
    });

    
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "mfa.totp_enabled",
        resource: "user",
        resourceId: session.user.id,
        securityLabel: "INTERNAL",
      },
    });

    return NextResponse.json({
      success: true,
      backupCodes, 
      message: "TOTP MFA enabled successfully",
    });
  } catch (error) {
    console.error("TOTP verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify TOTP" },
      { status: 500 }
    );
  }
}



