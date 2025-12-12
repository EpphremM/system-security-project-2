import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createVerificationOTP } from "@/lib/utils/verification";
import { sendVerificationEmail } from "@/lib/utils/email";

const resendOTPSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resendOTPSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Create new OTP
    const otp = await createVerificationOTP(user.id, user.email);

    // Send verification email with OTP
    await sendVerificationEmail(user.email, otp, user.name || undefined);

    // Log resend (audit)
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        category: "USER_ACTIVITY",
        logType: "DATA_UPDATE",
        action: "user.otp_resent",
        resource: "user",
        resourceId: user.id,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "OTP code resent successfully",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Failed to resend OTP" },
      { status: 500 }
    );
  }
}


