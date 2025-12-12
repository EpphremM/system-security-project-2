import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./password-hashing";

const PASSWORD_HISTORY_LIMIT = 5; // Keep last 5 passwords

/**
 * Check if password was used recently (last 5 passwords)
 */
export async function isPasswordInHistory(
  userId: string,
  password: string
): Promise<boolean> {
  // Get user's current password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    return false;
  }

  // Check current password
  const matchesCurrent = await verifyPassword(password, user.passwordHash);
  if (matchesCurrent) {
    return true;
  }

  // Get password history (last 5)
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: PASSWORD_HISTORY_LIMIT,
    select: { passwordHash: true },
  });

  // Check against history
  for (const entry of history) {
    const matches = await verifyPassword(password, entry.passwordHash);
    if (matches) {
      return true;
    }
  }

  return false;
}

/**
 * Add password to history
 */
export async function addPasswordToHistory(
  userId: string,
  passwordHash: string
): Promise<void> {
  // Add new password to history
  await prisma.passwordHistory.create({
    data: {
      userId,
      passwordHash,
    },
  });

  // Get all history entries
  const allHistory = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  // Keep only last 5 passwords
  if (allHistory.length > PASSWORD_HISTORY_LIMIT) {
    const toDelete = allHistory.slice(PASSWORD_HISTORY_LIMIT);
    for (const entry of toDelete) {
      await prisma.passwordHistory.delete({
        where: { id: entry.id },
      });
    }
  }
}

/**
 * Clean up old password history entries
 */
export async function cleanupPasswordHistory(daysOld: number = 365): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const oldEntries = await prisma.passwordHistory.findMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  let deleted = 0;
  for (const entry of oldEntries) {
    try {
      await prisma.passwordHistory.delete({
        where: { id: entry.id },
      });
      deleted++;
    } catch (error) {
      console.error("Error deleting password history entry:", error);
    }
  }

  return deleted;
}




