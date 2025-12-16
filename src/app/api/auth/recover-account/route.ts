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


const recoveryTokens = new Map<string, { userId: string; expires: Date }>();


export async function POST(request: NextRequest) {
  try {
    
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

    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    
    if (!user || !user.emailVerified) {
      
      return NextResponse.json(
        {
          message: "If an account exists with this email, a recovery link has been sent.",
        },
        { status: 200 }
      );
    }

    
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); 

    
    recoveryTokens.set(token, { userId: user.id, expires });

    
    await sendRecoveryEmail(user.email, token, user.name || undefined);

    
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

    
    const tokenData = recoveryTokens.get(token);
    if (!tokenData || tokenData.expires < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired recovery token" },
        { status: 400 }
      );
    }

    
    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId, email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    
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

    
    const { hashPassword } = await import("@/lib/utils/password-hashing");
    const { addPasswordToHistory } = await import("@/lib/utils/password-history");
    const { calculatePasswordExpiration } = await import("@/lib/utils/password-policy");

    const newPasswordHash = await hashPassword(newPassword);

    
    if (user.passwordHash) {
      await addPasswordToHistory(user.id, user.passwordHash);
    }

    
    const passwordChangedAt = new Date();
    const passwordExpiresAt = calculatePasswordExpiration(passwordChangedAt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt,
        passwordExpiresAt,
        sessionVersion: {
          increment: 1, 
        },
        failedLoginAttempts: 0, 
        accountLockedUntil: null, 
      },
    });

    
    recoveryTokens.delete(token);

    
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





