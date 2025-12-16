import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./password-hashing";

const PASSWORD_HISTORY_LIMIT = 5; 


export async function isPasswordInHistory(
  userId: string,
  password: string
): Promise<boolean> {
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    return false;
  }

  
  const matchesCurrent = await verifyPassword(password, user.passwordHash);
  if (matchesCurrent) {
    return true;
  }

  
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: PASSWORD_HISTORY_LIMIT,
    select: { passwordHash: true },
  });

  
  for (const entry of history) {
    const matches = await verifyPassword(password, entry.passwordHash);
    if (matches) {
      return true;
    }
  }

  return false;
}


export async function addPasswordToHistory(
  userId: string,
  passwordHash: string
): Promise<void> {
  
  await prisma.passwordHistory.create({
    data: {
      userId,
      passwordHash,
    },
  });

  
  const allHistory = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  
  if (allHistory.length > PASSWORD_HISTORY_LIMIT) {
    const toDelete = allHistory.slice(PASSWORD_HISTORY_LIMIT);
    for (const entry of toDelete) {
      await prisma.passwordHistory.delete({
        where: { id: entry.id },
      });
    }
  }
}


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





