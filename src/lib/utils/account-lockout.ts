import { prisma } from "@/lib/prisma";
import { LockoutType } from "../../generated/prisma/client";

const MAX_ATTEMPTS_LEVEL_1 = 5; // 15 minute lock
const MAX_ATTEMPTS_LEVEL_2 = 10; // 24 hour lock
const LOCKOUT_DURATION_LEVEL_1 = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_LEVEL_2 = 24 * 60 * 60 * 1000; // 24 hours

export interface LockoutCheck {
  locked: boolean;
  lockedUntil?: Date;
  attempts: number;
  retryAfter?: number; // seconds
}

/**
 * Check if account is locked
 */
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

  // Check if account is locked
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

  // Clear lock if expired
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

/**
 * Check if IP address is locked
 */
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

  // Check if lockout is still active
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

  // Delete expired lockout
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

/**
 * Record failed login attempt
 */
export async function recordFailedLogin(
  email: string,
  ipAddress: string
): Promise<{ locked: boolean; lockedUntil?: Date }> {
  // Update user failed attempts
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { locked: false };
  }

  const newAttempts = (user.failedLoginAttempts || 0) + 1;
  let lockedUntil: Date | null = null;

  // Progressive lockout
  if (newAttempts >= MAX_ATTEMPTS_LEVEL_2) {
    // 24 hour lock
    lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_LEVEL_2);
  } else if (newAttempts >= MAX_ATTEMPTS_LEVEL_1) {
    // 15 minute lock
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

  // Update IP-based lockout
  await updateIPLockout(ipAddress);

  return {
    locked: lockedUntil !== null,
    lockedUntil: lockedUntil || undefined,
  };
}

/**
 * Reset failed login attempts on successful login
 */
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

/**
 * Update IP-based lockout
 */
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
    lockedUntil = new Date(Date.now() + 60 * 1000); // 1 minute for early attempts
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

/**
 * Clean up expired lockouts
 */
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

