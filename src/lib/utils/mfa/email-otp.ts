import { randomBytes } from "crypto";
import { hash } from "@/lib/utils/crypto";
import { sendEmail } from "@/lib/utils/email";
import { prisma } from "@/lib/prisma";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Rate limiter for email OTP (max 3 per 5 minutes per user)
const emailOTPRateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 300, // 5 minutes
  blockDuration: 600, // Block for 10 minutes if limit exceeded
});

/**
 * Generate a 6-digit OTP code
 */
export function generateEmailOTPCode(): string {
  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

/**
 * Hash OTP code for storage
 */
export async function hashEmailOTPCode(code: string): Promise<string> {
  return hash(code);
}

/**
 * Verify OTP code against hashed code
 */
export async function verifyEmailOTPCode(
  code: string,
  hashedCode: string
): Promise<boolean> {
  const hashedInput = await hashEmailOTPCode(code);
  return hashedInput === hashedCode;
}

/**
 * Send email OTP to user
 */
export async function sendEmailOTP(
  userId: string,
  email: string,
  name?: string,
  ipAddress?: string
): Promise<string> {
  // Check rate limit
  try {
    await emailOTPRateLimiter.consume(userId);
  } catch (error) {
    throw new Error("Too many OTP requests. Please try again later.");
  }

  // Generate OTP code
  const code = generateEmailOTPCode();
  const hashedCode = await hashEmailOTPCode(code);

  // Expires in 5 minutes
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Store OTP in database
  await prisma.mFAEmailOTP.create({
    data: {
      userId,
      code: hashedCode,
      expiresAt,
      ipAddress,
    },
  });

  // Send email
  await sendEmail(
    email,
    "Your Verification Code",
    `
      <h1>Your Verification Code</h1>
      <p>Hello${name ? `, ${name}` : ""},</p>
      <p>Your verification code is:</p>
      <h2 style="font-size: 32px; letter-spacing: 4px; color: #2563eb;">${code}</h2>
      <p>This code will expire in 5 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    `
  );

  return code; // Return for testing purposes (remove in production if needed)
}

/**
 * Verify email OTP code
 */
export async function verifyEmailOTP(
  userId: string,
  code: string
): Promise<boolean> {
  // Find the most recent unused OTP for this user
  const otp = await prisma.mFAEmailOTP.findFirst({
    where: {
      userId,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otp) {
    return false;
  }

  // Verify the code
  const isValid = await verifyEmailOTPCode(code, otp.code);

  if (isValid) {
    // Mark as used
    await prisma.mFAEmailOTP.update({
      where: { id: otp.id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });
  }

  return isValid;
}

/**
 * Clean up expired OTP codes (should be run periodically)
 */
export async function cleanupExpiredOTPs() {
  await prisma.mFAEmailOTP.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { used: true, usedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Delete used OTPs older than 24 hours
      ],
    },
  });
}



