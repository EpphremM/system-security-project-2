import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hash, compare } from "bcryptjs";


export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}


export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


export async function createVerificationToken(
  userId: string,
  email: string
): Promise<string> {
  const token = generateVerificationToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); 

  
  const hashedToken = await hash(token, 10);

  
  
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


export async function createVerificationOTP(
  userId: string,
  email: string
): Promise<string> {
  const otp = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000); 

  
  const hashedOTP = await hash(otp, 10);

  
  await prisma.verificationToken.deleteMany({
    where: {
      identifier: email,
    },
  });

  
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashedOTP,
      expires,
    },
  });

  return otp;
}


export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  
  const tokens = await prisma.verificationToken.findMany({
    where: {
      identifier: email,
      expires: {
        gt: new Date(),
      },
    },
  });

  
  for (const tokenRecord of tokens) {
    const isValid = await compare(otp, tokenRecord.token);
    if (isValid) {
      
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


export async function verifyToken(
  email: string,
  token: string
): Promise<boolean> {
  
  
  
  
  
  
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
        return true;
      }
    } catch (error) {
      
      continue;
    }
  }

  return false;
}


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


export async function markEmailAsVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: new Date(),
    },
  });
}


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
    
    console.error("Error deleting verification token:", error);
  }
}


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
