import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { sendRecoveryEmail } from "@/lib/utils/email";
import { authRateLimiter } from "@/lib/utils/rate-limiter";

const recoverAccountSchema = z.object({
  email: z.string().email(),
});

const verifyRecoverySchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  newPassword: z.string().min(12),
});

// Store recovery tokens temporarily (in production, use Redis)
const recoveryTokens = new Map<string, { userId: string; expires: Date }>();

/**
 * Request account recovery
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip ?? request.headers.get("x-forwarded-for") ?? "unknown";
    try {
      await authRateLimiter.consume(ip);
    } catch {
      return NextResponse.json(
        { error: "Too many recovery requests" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = recoverAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    // Don't reveal if user exists (prevent enumeration)
    if (!user || !user.emailVerified) {
      // Still return success to prevent user enumeration
      return NextResponse.json(
        {
          message: "If an account exists with this email, a recovery link has been sent.",
        },
        { status: 200 }
      );
    }

    // Generate recovery token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    recoveryTokens.set(token, { userId: user.id, expires });

    // Send recovery email
    await sendRecoveryEmail(user.email, token, user.name || undefined);

    // Log recovery request
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "user.recovery_requested",
        resource: "user",
        resourceId: user.id,
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
        securityLabel: "INTERNAL",
      },
    });

    return NextResponse.json(
      {
        message: "If an account exists with this email, a recovery link has been sent.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Account recovery error:", error);
    return NextResponse.json(
      { error: "Recovery request failed" },
      { status: 500 }
    );
  }
}

/**
 * Verify recovery token and reset password
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyRecoverySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { email, token, newPassword } = parsed.data;

    // Verify token
    const tokenData = recoveryTokens.get(token);
    if (!tokenData || tokenData.expires < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired recovery token" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId, email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Validate new password policy
    const { validatePasswordPolicy } = await import("@/lib/utils/password-policy");
    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.valid) {
      return NextResponse.json(
        {
          error: "Password does not meet requirements",
          details: policyResult.errors,
        },
        { status: 400 }
      );
    }

    // Hash new password
    const { hashPassword } = await import("@/lib/utils/password-hashing");
    const { addPasswordToHistory } = await import("@/lib/utils/password-history");
    const { calculatePasswordExpiration } = await import("@/lib/utils/password-policy");

    const newPasswordHash = await hashPassword(newPassword);

    // Add old password to history
    if (user.passwordHash) {
      await addPasswordToHistory(user.id, user.passwordHash);
    }

    // Update password
    const passwordChangedAt = new Date();
    const passwordExpiresAt = calculatePasswordExpiration(passwordChangedAt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt,
        passwordExpiresAt,
        sessionVersion: {
          increment: 1, // Invalidate all sessions
        },
        failedLoginAttempts: 0, // Reset failed attempts
        accountLockedUntil: null, // Unlock account
      },
    });

    // Delete recovery token
    recoveryTokens.delete(token);

    // Log password recovery
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "user.password_recovered",
        resource: "user",
        resourceId: user.id,
        ipAddress: request.ip ?? request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
        securityLabel: "INTERNAL",
      },
    });

    return NextResponse.json(
      {
        message: "Password reset successfully. Please log in with your new password.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password recovery error:", error);
    return NextResponse.json(
      { error: "Password recovery failed" },
      { status: 500 }
    );
  }
}




