import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyToken,
  markEmailAsVerified,
  deleteVerificationToken,
} from "@/lib/utils/verification";
import { sendWelcomeEmail } from "@/lib/utils/email";
import { authRateLimiter } from "@/lib/utils/rate-limiter";

const verifySchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    
    const ip = request.ip ?? request.headers.get("x-forwarded-for") ?? "unknown";
    try {
      await authRateLimiter.consume(ip);
    } catch {
      return NextResponse.json(
        { error: "Too many verification attempts" },
        { status: 429 }
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

    const { token, email } = parsed.data;

    
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    
    const isValid = await verifyToken(email, token);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    
    await markEmailAsVerified(user.id);

    
    await deleteVerificationToken(email, token);

    
    await sendWelcomeEmail(user.email, user.name || undefined);

    
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "user.email_verified",
        resource: "user",
        resourceId: user.id,
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json(
      {
        message: "Email verified successfully",
        verified: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}





