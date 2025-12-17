import { randomBytes } from "crypto";
import { hash } from "@/lib/utils/crypto";
import { sendEmail } from "@/lib/utils/email";
import { prisma } from "@/lib/prisma";
import { RateLimiterMemory } from "rate-limiter-flexible";


const emailOTPRateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 300, 
  blockDuration: 600, 
});


export function generateEmailOTPCode(): string {
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}


export async function hashEmailOTPCode(code: string): Promise<string> {
  return hash(code);
}


export async function verifyEmailOTPCode(
  code: string,
  hashedCode: string
): Promise<boolean> {
  const hashedInput = await hashEmailOTPCode(code);
  return hashedInput === hashedCode;
}


export async function sendEmailOTP(
  userId: string,
  email: string,
  name?: string,
  ipAddress?: string
): Promise<string> {
  
  try {
    await emailOTPRateLimiter.consume(userId);
  } catch (error) {
    throw new Error("Too many OTP requests. Please try again later.");
  }

  
  const code = generateEmailOTPCode();
  const hashedCode = await hashEmailOTPCode(code);

  
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  
  await prisma.mFAEmailOTP.create({
    data: {
      userId,
      code: hashedCode,
      expiresAt,
      ipAddress,
    },
  });

  
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

  return code; 

}


export async function verifyEmailOTP(
  userId: string,
  code: string
): Promise<boolean> {
  

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

  

  const isValid = await verifyEmailOTPCode(code, otp.code);

  if (isValid) {
    

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


export async function cleanupExpiredOTPs() {
  await prisma.mFAEmailOTP.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { used: true, usedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, 

      ],
    },
  });
}



