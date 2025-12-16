import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  extractClientMetadata,
  calculateBehavioralScore,
  shouldBlockSubmission,
  checkRegistrationRateLimit,
  generateDeviceFingerprint,
} from "@/lib/utils/bot-prevention";
import { createVerificationOTP } from "@/lib/utils/verification";
import { sendVerificationEmail } from "@/lib/utils/email";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(12, "Password must be at least 12 characters"),
  name: z.string().min(1, "Name is required").max(100),
  department: z.string().min(1, "Department is required"),
  roleId: z.string().uuid().optional(),
  captchaToken: z.string().optional(), 
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms of service",
  }),
  
  formFillTime: z.number().optional(),
  mouseMovements: z.number().optional(),
  keystrokes: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    
    const metadata = extractClientMetadata(request);
    const deviceFingerprint = generateDeviceFingerprint(request);
    metadata.deviceFingerprint = deviceFingerprint;

    
    const rateLimitCheck = await checkRegistrationRateLimit(metadata.ipAddress);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Too many registration attempts",
          retryAfter: rateLimitCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    
    metadata.formFillTime = data.formFillTime;
    metadata.mouseMovements = data.mouseMovements;
    metadata.keystrokes = data.keystrokes;

    
    const behavioralScore = calculateBehavioralScore(metadata);
    if (shouldBlockSubmission(behavioralScore)) {
      return NextResponse.json(
        {
          error: "Registration blocked",
          reason: "Suspicious activity detected",
          details: behavioralScore.reasons,
        },
        { status: 403 }
      );
    }

    
    if (data.captchaToken) {
      console.log("CAPTCHA token provided, verifying (non-blocking)...");
      verifyCaptcha(data.captchaToken, metadata.ipAddress).catch((err) => {
        console.warn("CAPTCHA verification error (non-blocking):", err);
      });
      
    } else {
      console.log("No CAPTCHA token provided, skipping verification");
    }

    
    const { validatePasswordPolicy } = await import("@/lib/utils/password-policy");
    const policyResult = validatePasswordPolicy(data.password);
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

    
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    
    const { hashPassword } = await import("@/lib/utils/password-hashing");
    const { calculatePasswordExpiration } = await import("@/lib/utils/password-policy");
    const passwordHash = await hashPassword(data.password);
    const passwordExpiresAt = calculatePasswordExpiration(new Date());

    
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        department: data.department,
        passwordHash,
        passwordChangedAt: new Date(),
        passwordExpiresAt,
        roleId: data.roleId || null,
        legacyRole: "USER", 
        emailVerified: null, 
      },
    });

    
    const otp = await createVerificationOTP(user.id, user.email);

    
    await sendVerificationEmail(user.email, otp, user.name || undefined);

    
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        category: "USER_ACTIVITY",
        logType: "DATA_CREATE",
        action: "user.registered",
        resource: "user",
        resourceId: user.id,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        details: {
          behavioralScore: behavioralScore.score,
          deviceFingerprint,
        },
      },
    });

    return NextResponse.json(
      {
        message: "Registration successful. Please check your email to verify your account.",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}


async function verifyCaptcha(
  token: string,
  remoteip: string
): Promise<boolean> {
  
  if (!process.env.HCAPTCHA_SECRET_KEY) {
    console.warn("HCAPTCHA_SECRET_KEY not set, skipping CAPTCHA verification");
    return true;
  }

  if (!token || token.length === 0) {
    console.error("CAPTCHA token is empty");
    return false;
  }

  try {
    const secretKey = process.env.HCAPTCHA_SECRET_KEY.trim();
    const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim();
    
    console.log("=== CAPTCHA Verification Debug ===");
    console.log("Site key:", siteKey);
    console.log("Secret key present:", !!secretKey);
    console.log("Secret key length:", secretKey.length);
    console.log("Token length:", token.length);
    console.log("Token preview:", token.substring(0, 30) + "...");
    console.log("Remote IP:", remoteip || "Not provided");

    const verifyUrl = "https://hcaptcha.com/siteverify";
    const body = new URLSearchParams({
      secret: secretKey,
      response: token,
    });
    
    
    if (remoteip) {
      body.append("remoteip", remoteip);
    }

    console.log("Sending request to:", verifyUrl);
    
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body,
    });

    if (!response.ok) {
      console.error("hCaptcha API request failed with status:", response.status);
      return false;
    }

    const data = await response.json();
    console.log("hCaptcha API full response:", JSON.stringify(data, null, 2));
    
    if (!data.success) {
      const errorCodes = data["error-codes"] || [];
      console.error("CAPTCHA verification failed. Error codes:", errorCodes);
      
      
      const errorMessages: Record<string, string> = {
        "missing-input-secret": "Secret key is missing in request",
        "invalid-input-secret": "Secret key is invalid or doesn't match site key",
        "missing-input-response": "Token is missing in request",
        "invalid-input-response": "Token is invalid, expired, or already used",
        "bad-request": "Invalid request format",
        "invalid-or-already-seen-response": "Token already used or expired",
        "sitekey-secret-mismatch": "Site key and secret key don't match",
      };
      
      errorCodes.forEach((code: string) => {
        console.error(`  - ${code}: ${errorMessages[code] || "Unknown error"}`);
      });
      
      if (errorCodes.includes("invalid-input-secret") || errorCodes.includes("sitekey-secret-mismatch")) {
        console.error("⚠️  SECRET KEY MISMATCH!");
        console.error("   Site key:", siteKey);
        console.error("   Secret key format:", secretKey.substring(0, 4) + "..." + secretKey.substring(secretKey.length - 4));
        console.error("   Make sure the secret key matches the site key in your hCaptcha dashboard!");
      }
      
      if (errorCodes.includes("invalid-input-response")) {
        console.error("⚠️  Token issue - user needs to complete CAPTCHA again");
      }
    } else {
      console.log("✓ CAPTCHA verified successfully!");
    }
    
    return data.success === true;
  } catch (error) {
    console.error("CAPTCHA verification error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return false;
  }
}

