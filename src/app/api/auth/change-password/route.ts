import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/utils/password-hashing";
import { validatePasswordPolicy } from "@/lib/utils/password-policy";
import { isPasswordInHistory, addPasswordToHistory } from "@/lib/utils/password-history";
import { calculatePasswordExpiration } from "@/lib/utils/password-policy";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
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
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        passwordHash: true,
        passwordChangedAt: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "User not found or no password set" },
        { status: 404 }
      );
    }

    // Verify current password
    const currentPasswordValid = await verifyPassword(
      currentPassword,
      user.passwordHash
    );

    if (!currentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Validate new password policy
    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.valid) {
      return NextResponse.json(
        {
          error: "Password does not meet requirements",
          details: policyResult.errors,
          warnings: policyResult.warnings,
        },
        { status: 400 }
      );
    }

    // Check password history (prevent reuse of last 5)
    const inHistory = await isPasswordInHistory(user.id, newPassword);
    if (inHistory) {
      return NextResponse.json(
        { error: "Password was recently used. Please choose a different password." },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Add current password to history before updating
    await addPasswordToHistory(user.id, user.passwordHash);

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
      },
    });

    // Log password change
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "user.password_changed",
        resource: "user",
        resourceId: user.id,
        ipAddress: request.ip ?? request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
        securityLabel: "INTERNAL",
      },
    });

    return NextResponse.json(
      {
        message: "Password changed successfully",
        passwordExpiresAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}




