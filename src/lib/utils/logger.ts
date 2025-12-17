import { prisma } from "@/lib/prisma";
import { VisitorAction, AccessAction } from "@prisma/client";


export async function logVisitorAction(
  visitorId: string,
  action: VisitorAction,
  userId?: string,
  description?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.visitorLog.create({
      data: {
        visitorId,
        userId: userId || null,
        action,
        description,
        metadata: metadata || null,
      },
    });
  } catch (error) {
    console.error("Failed to log visitor action:", error);
  }
}


export async function logAccess(
  action: AccessAction,
  options: {
    visitorId?: string;
    userId?: string;
    location?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await prisma.accessLog.create({
      data: {
        visitorId: options.visitorId || null,
        userId: options.userId || null,
        action,
        location: options.location || null,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        metadata: options.metadata || null,
      },
    });
  } catch (error) {
    console.error("Failed to log access:", error);
  }
}






