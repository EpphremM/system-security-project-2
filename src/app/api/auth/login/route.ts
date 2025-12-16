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
    
    const metadata = extractClientMetadata(request);
    const ipAddress = metadata.ipAddress;

    
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

    
    const accountLockout = await checkAccountLockout(email);
    if (accountLockout.locked) {
      return NextResponse.json(
        {
          error: "Account is locked due to too many failed login attempts",
          retryAfter: accountLockout.retryAfter,
          lockedUntil: accountLockout.lockedUntil,
        },
        { status: 423 } 
      );
    }

    
    
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        
        const { recordFailedLogin } = await import("@/lib/utils/account-lockout");
        await recordFailedLogin(email, ipAddress);
        
        
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

      
      if (user?.mfaEnabled) {
        
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

