import { prisma } from "@/lib/prisma";
import { LockoutType } from "../../generated/prisma/client";

const MAX_ATTEMPTS_LEVEL_1 = 5; 
const MAX_ATTEMPTS_LEVEL_2 = 10; 
const LOCKOUT_DURATION_LEVEL_1 = 15 * 60 * 1000; 
const LOCKOUT_DURATION_LEVEL_2 = 24 * 60 * 60 * 1000; 

export interface LockoutCheck {
  locked: boolean;
  lockedUntil?: Date;
  attempts: number;
  retryAfter?: number; 
}


export async function checkAccountLockout(
  email: string
): Promise<LockoutCheck> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      failedLoginAttempts: true,
      accountLockedUntil: true,
    },
  });

  if (!user) {
    return { locked: false, attempts: 0 };
  }

  
  if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
    const retryAfter = Math.ceil(
      (user.accountLockedUntil.getTime() - Date.now()) / 1000
    );
    return {
      locked: true,
      lockedUntil: user.accountLockedUntil,
      attempts: user.failedLoginAttempts,
      retryAfter,
    };
  }

  
  if (user.accountLockedUntil && user.accountLockedUntil <= new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accountLockedUntil: null,
        failedLoginAttempts: 0,
      },
    });
  }

  return {
    locked: false,
    attempts: user.failedLoginAttempts,
  };
}


export async function checkIPLockout(ipAddress: string): Promise<LockoutCheck> {
  const lockout = await prisma.accountLockout.findUnique({
    where: {
      identifier_type: {
        identifier: ipAddress,
        type: LockoutType.IP_ADDRESS,
      },
    },
  });

  if (!lockout) {
    return { locked: false, attempts: 0 };
  }

  
  if (lockout.lockedUntil > new Date()) {
    const retryAfter = Math.ceil(
      (lockout.lockedUntil.getTime() - Date.now()) / 1000
    );
    return {
      locked: true,
      lockedUntil: lockout.lockedUntil,
      attempts: lockout.attempts,
      retryAfter,
    };
  }

  
  await prisma.accountLockout.delete({
    where: {
      identifier_type: {
        identifier: ipAddress,
        type: LockoutType.IP_ADDRESS,
      },
    },
  });

  return { locked: false, attempts: 0 };
}


export async function recordFailedLogin(
  email: string,
  ipAddress: string
): Promise<{ locked: boolean; lockedUntil?: Date }> {
  
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { locked: false };
  }

  const newAttempts = (user.failedLoginAttempts || 0) + 1;
  let lockedUntil: Date | null = null;

  
  if (newAttempts >= MAX_ATTEMPTS_LEVEL_2) {
    
    lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_LEVEL_2);
  } else if (newAttempts >= MAX_ATTEMPTS_LEVEL_1) {
    
    lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_LEVEL_1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: newAttempts,
      accountLockedUntil: lockedUntil,
      lastFailedLoginAt: new Date(),
    },
  });

  
  await updateIPLockout(ipAddress);

  return {
    locked: lockedUntil !== null,
    lockedUntil: lockedUntil || undefined,
  };
}


export async function resetFailedLoginAttempts(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user && user.failedLoginAttempts > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
    });
  }
}


async function updateIPLockout(ipAddress: string): Promise<void> {
  const existing = await prisma.accountLockout.findUnique({
    where: {
      identifier_type: {
        identifier: ipAddress,
        type: LockoutType.IP_ADDRESS,
      },
    },
  });

  const newAttempts = (existing?.attempts || 0) + 1;
  let lockedUntil: Date;

  if (newAttempts >= MAX_ATTEMPTS_LEVEL_2) {
    lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_LEVEL_2);
  } else if (newAttempts >= MAX_ATTEMPTS_LEVEL_1) {
    lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_LEVEL_1);
  } else {
    lockedUntil = new Date(Date.now() + 60 * 1000); 
  }

  await prisma.accountLockout.upsert({
    where: {
      identifier_type: {
        identifier: ipAddress,
        type: LockoutType.IP_ADDRESS,
      },
    },
    update: {
      attempts: newAttempts,
      lockedUntil,
    },
    create: {
      identifier: ipAddress,
      type: LockoutType.IP_ADDRESS,
      attempts: newAttempts,
      lockedUntil,
    },
  });
}


export async function cleanupExpiredLockouts(): Promise<number> {
  const expired = await prisma.accountLockout.findMany({
    where: {
      lockedUntil: {
        lt: new Date(),
      },
    },
  });

  let deleted = 0;
  for (const lockout of expired) {
    try {
      await prisma.accountLockout.delete({
        where: {
          identifier_type: {
            identifier: lockout.identifier,
            type: lockout.type,
          },
        },
      });
      deleted++;
    } catch (error) {
      console.error("Error deleting expired lockout:", error);
    }
  }

  return deleted;
}

