import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailOTP } from "@/lib/utils/mfa/email-otp";
import { extractClientMetadata } from "@/lib/utils/bot-prevention";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const metadata = extractClientMetadata(request);
    const ipAddress = metadata.ipAddress;

    // Send OTP to verify email
    await sendEmailOTP(
      session.user.id,
      session.user.email,
      session.user.name || undefined,
      ipAddress
    );

    // Enable MFA (email OTP doesn't require additional setup)
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        mfaEnabled: true,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "mfa.email_otp_enabled",
        resource: "user",
        resourceId: session.user.id,
        securityLabel: "INTERNAL",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email OTP sent. Please verify to complete setup.",
    });
  } catch (error) {
    console.error("Email OTP setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to setup email OTP" },
      { status: 500 }
    );
  }
}



