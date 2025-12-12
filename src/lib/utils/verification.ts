import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hash, compare } from "bcryptjs";

/**
 * Generate secure verification token (for link-based verification)
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create verification token for user (link-based)
 */
export async function createVerificationToken(
  userId: string,
  email: string
): Promise<string> {
  const token = generateVerificationToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Hash token before storing
  const hashedToken = await hash(token, 10);

  // Store both plain token (for email) and hashed token (for database)
  // In production, use Redis for token mapping
  await prisma.verificationToken.upsert({
    where: {
      identifier_token: {
        identifier: email,
        token: hashedToken,
      },
    },
    update: {
      token: hashedToken,
      expires,
    },
    create: {
      identifier: email,
      token: hashedToken,
      expires,
    },
  });

  return token;
}

/**
 * Create OTP for email verification
 */
export async function createVerificationOTP(
  userId: string,
  email: string
): Promise<string> {
  const otp = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Hash OTP before storing
  const hashedOTP = await hash(otp, 10);

  // Delete old tokens for this email
  await prisma.verificationToken.deleteMany({
    where: {
      identifier: email,
    },
  });

  // Store new OTP in verification token table
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashedOTP,
      expires,
    },
  });

  return otp;
}

/**
 * Verify OTP code
 */
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  // Get all verification tokens for this email
  const tokens = await prisma.verificationToken.findMany({
    where: {
      identifier: email,
      expires: {
        gt: new Date(),
      },
    },
  });

  // Check if any token matches the OTP
  for (const tokenRecord of tokens) {
    const isValid = await compare(otp, tokenRecord.token);
    if (isValid) {
      // Delete the used token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: tokenRecord.token,
          },
        },
      });
      return true;
    }
  }

  return false;
}

/**
 * Verify token by checking all tokens for the email
 */
export async function verifyToken(
  email: string,
  token: string
): Promise<boolean> {
  // Get all verification tokens for this email
  // Note: Prisma doesn't support finding by hashed value directly
  // In production, store token mapping in Redis or use a different approach
  
  // For now, we'll need to get all tokens and compare
  // This is not ideal for production - use Redis instead
  const verificationTokens = await prisma.verificationToken.findMany({
    where: {
      identifier: email,
      expires: {
        gt: new Date(), // Not expired
      },
    },
  });

  // Compare token with all stored hashed tokens
  for (const vt of verificationTokens) {
    try {
      const isValid = await compare(token, vt.token);
      if (isValid) {
        return true;
      }
    } catch (error) {
      // Continue checking other tokens
      continue;
    }
  }

  return false;
}

/**
 * Get verification token record for deletion
 */
async function getVerificationTokenRecord(
  email: string,
  token: string
): Promise<{ identifier: string; token: string } | null> {
  const verificationTokens = await prisma.verificationToken.findMany({
    where: {
      identifier: email,
      expires: {
        gt: new Date(),
      },
    },
  });

  for (const vt of verificationTokens) {
    try {
      const isValid = await compare(token, vt.token);
      if (isValid) {
        return {
          identifier: vt.identifier,
          token: vt.token,
        };
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}

/**
 * Mark user email as verified
 */
export async function markEmailAsVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: new Date(),
    },
  });
}

/**
 * Delete verification token after use
 */
export async function deleteVerificationToken(
  email: string,
  token: string
): Promise<void> {
  try {
    const tokenRecord = await getVerificationTokenRecord(email, token);
    if (tokenRecord) {
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: tokenRecord.identifier,
            token: tokenRecord.token,
          },
        },
      });
    }
  } catch (error) {
    // Token might already be deleted
    console.error("Error deleting verification token:", error);
  }
}

/**
 * Clean up expired verification tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const expiredTokens = await prisma.verificationToken.findMany({
    where: {
      expires: {
        lt: new Date(),
      },
    },
  });

  let deleted = 0;
  for (const token of expiredTokens) {
    try {
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: token.identifier,
            token: token.token,
          },
        },
      });
      deleted++;
    } catch (error) {
      console.error("Error deleting expired token:", error);
    }
  }

  return deleted;
}

/**
 * Clean up unverified users older than specified days
 */
export async function cleanupUnverifiedUsers(daysOld: number = 7): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const unverifiedUsers = await prisma.user.findMany({
    where: {
      emailVerified: null,
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  let deleted = 0;
  for (const user of unverifiedUsers) {
    try {
      await prisma.user.delete({
        where: { id: user.id },
      });
      deleted++;
    } catch (error) {
      console.error("Error deleting unverified user:", error);
    }
  }

  return deleted;
}
