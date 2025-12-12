import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { extractClientMetadata } from "@/lib/utils/bot-prevention";
import { checkAccountLockout, checkIPLockout } from "@/lib/utils/account-lockout";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Extract client metadata
    const metadata = extractClientMetadata(request);
    const ipAddress = metadata.ipAddress;

    // Check IP-based lockout
    const ipLockout = await checkIPLockout(ipAddress);
    if (ipLockout.locked) {
      return NextResponse.json(
        {
          error: "Too many login attempts from this IP",
          retryAfter: ipLockout.retryAfter,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Check account lockout
    const accountLockout = await checkAccountLockout(email);
    if (accountLockout.locked) {
      return NextResponse.json(
        {
          error: "Account is locked due to too many failed login attempts",
          retryAfter: accountLockout.retryAfter,
          lockedUntil: accountLockout.lockedUntil,
        },
        { status: 423 } // 423 Locked
      );
    }

    // Attempt sign in (this will use the authorize function in auth config)
    // The authorize function will check account lockout and verify password
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Record failed attempt (already recorded in authorize, but update with IP)
        const { recordFailedLogin } = await import("@/lib/utils/account-lockout");
        await recordFailedLogin(email, ipAddress);
        
        // Log failed attempt with IP
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        
        if (user) {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "auth.failed_login",
              resource: "user",
              resourceId: user.id,
              ipAddress,
              userAgent: request.headers.get("user-agent") ?? undefined,
              securityLabel: "INTERNAL",
            },
          });
        }
        
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      // Password verified - now check if MFA is required
      const user = await prisma.user.findUnique({
        where: { email },
        select: { 
          id: true, 
          mfaEnabled: true,
          webauthnDevices: {
            select: { id: true },
          },
        },
      });

      // If MFA is enabled, require MFA verification before completing login
      if (user?.mfaEnabled) {
        // Determine available MFA methods
        const hasWebAuthn = user.webauthnDevices.length > 0;
        const availableMethods: string[] = ["totp", "email_otp", "backup_code", "emergency_token"];
        if (hasWebAuthn) {
          availableMethods.push("webauthn");
        }

        return NextResponse.json(
          {
            message: "MFA verification required",
            requiresMFA: true,
            userId: user.id,
            availableMethods,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          message: "Login successful",
          success: true,
        },
        { status: 200 }
      );
    } catch (error: any) {
      // Handle lockout errors from authorize function
      if (error.message?.includes("locked")) {
        return NextResponse.json(
          { error: error.message },
          { status: 423 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Login error:", error);
    
    // Handle lockout errors
    if (error.message?.includes("locked")) {
      return NextResponse.json(
        { error: error.message },
        { status: 423 }
      );
    }

    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}

