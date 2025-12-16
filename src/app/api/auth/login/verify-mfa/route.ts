import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  verifyTOTPCode,
  verifyBackupCode,
  verifyEmergencyToken,
} from "@/lib/utils/mfa/totp";
import { verifyEmailOTP } from "@/lib/utils/mfa/email-otp";
import {
  verifyWebAuthnAuthentication,
  generateWebAuthnAuthenticationOptions,
} from "@/lib/utils/mfa/webauthn";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

const verifyMFASchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  method: z.enum(["totp", "backup_code", "emergency_token", "email_otp", "webauthn"]),
  code: z.string().optional(),
  token: z.string().optional(),
  response: z.any().optional(), 
  challenge: z.string().optional(), 
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyMFASchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { email, password, method, code, token, response, challenge } = parsed.data;

    
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInResult?.error) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { webauthnDevices: true },
    });

    if (!user || !user.mfaEnabled) {
      return NextResponse.json(
        { error: "MFA not enabled for this user" },
        { status: 400 }
      );
    }

    
    let verified = false;

    switch (method) {
      case "totp":
        if (!code || !user.mfaSecret) {
          return NextResponse.json(
            { error: "TOTP code required" },
            { status: 400 }
          );
        }
        verified = verifyTOTPCode(user.mfaSecret, code);
        break;

      case "backup_code":
        if (!code) {
          return NextResponse.json(
            { error: "Backup code required" },
            { status: 400 }
          );
        }
        const backupCode = await prisma.mFABackupCode.findFirst({
          where: {
            userId: user.id,
            used: false,
          },
        });
        if (!backupCode) {
          return NextResponse.json(
            { error: "No unused backup codes found" },
            { status: 400 }
          );
        }
        verified = await verifyBackupCode(code, backupCode.code);
        if (verified) {
          await prisma.mFABackupCode.update({
            where: { id: backupCode.id },
            data: {
              used: true,
              usedAt: new Date(),
            },
          });
        }
        break;

      case "emergency_token":
        if (!token) {
          return NextResponse.json(
            { error: "Emergency token required" },
            { status: 400 }
          );
        }
        const emergencyToken = await prisma.mFAEmergencyToken.findFirst({
          where: {
            userId: user.id,
            used: false,
            expiresAt: {
              gt: new Date(),
            },
          },
        });
        if (!emergencyToken) {
          return NextResponse.json(
            { error: "No valid emergency token found" },
            { status: 400 }
          );
        }
        verified = await verifyEmergencyToken(token, emergencyToken.token);
        if (verified) {
          await prisma.mFAEmergencyToken.update({
            where: { id: emergencyToken.id },
            data: {
              used: true,
              usedAt: new Date(),
            },
          });
        }
        break;

      case "email_otp":
        if (!code) {
          return NextResponse.json(
            { error: "Email OTP code required" },
            { status: 400 }
          );
        }
        verified = await verifyEmailOTP(user.id, code);
        break;

      case "webauthn":
        if (!response || !challenge) {
          return NextResponse.json(
            { error: "WebAuthn response and challenge required" },
            { status: 400 }
          );
        }
        const webauthnResult = await verifyWebAuthnAuthentication(
          user.id,
          response as AuthenticationResponseJSON,
          challenge
        );
        verified = webauthnResult.verified;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid MFA method" },
          { status: 400 }
        );
    }

    if (!verified) {
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "mfa.verification_failed",
          resource: "user",
          resourceId: user.id,
          securityLabel: "INTERNAL",
          details: {
            method,
          },
        },
      });

      return NextResponse.json(
        { error: "MFA verification failed" },
        { status: 401 }
      );
    }

    
    
    const finalSignIn = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (finalSignIn?.error) {
      return NextResponse.json(
        { error: "Failed to complete login" },
        { status: 500 }
      );
    }

    
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "mfa.verification_success",
        resource: "user",
        resourceId: user.id,
        securityLabel: "INTERNAL",
        details: {
          method,
        },
      },
    });

    return NextResponse.json({
      message: "Login successful",
      success: true,
    });
  } catch (error) {
    console.error("MFA login verify error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify MFA" },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { webauthnDevices: true },
    });

    if (!user || !user.mfaEnabled || user.webauthnDevices.length === 0) {
      return NextResponse.json(
        { error: "WebAuthn not available for this user" },
        { status: 400 }
      );
    }

    const options = await generateWebAuthnAuthenticationOptions(user.id);

    return NextResponse.json({
      options,
      challenge: options.challenge,
    });
  } catch (error) {
    console.error("WebAuthn auth options error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate WebAuthn options" },
      { status: 500 }
    );
  }
}



