import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateEmergencyToken,
  hashEmergencyToken,
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

    // Generate emergency token (expires in 30 days)
    const token = generateEmergencyToken();
    const hashedToken = await hashEmergencyToken(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Store emergency token
    await prisma.mFAEmergencyToken.create({
      data: {
        userId: session.user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "mfa.emergency_token_generated",
        resource: "user",
        resourceId: session.user.id,
        securityLabel: "INTERNAL",
      },
    });

    return NextResponse.json({
      success: true,
      token, // Return plain token only once - user must save it
      expiresAt,
      message: "Emergency token generated successfully",
    });
  } catch (error) {
    console.error("Emergency token error:", error);
    return NextResponse.json(
      { error: "Failed to generate emergency token" },
      { status: 500 }
    );
  }
}

/**
 * Get remaining unused emergency tokens
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

    const tokens = await prisma.mFAEmergencyToken.findMany({
      where: {
        userId: session.user.id,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      tokens,
      count: tokens.length,
    });
  } catch (error) {
    console.error("Emergency tokens list error:", error);
    return NextResponse.json(
      { error: "Failed to get emergency tokens" },
      { status: 500 }
    );
  }
}



