import { prisma } from "@/lib/prisma";
import { SecurityLevel } from "@/generated/prisma/enums";
import { encryptLogData } from "@/lib/logging/encryption";
import { randomBytes, createHash } from "crypto";
import { logAccess } from "@/lib/utils/logger";

/**
 * Grant area access to visitor
 */
export async function grantAreaAccess(
  visitorId: string,
  areaId: string,
  options?: {
    expiresAt?: Date;
    requiresEscort?: boolean;
    escortId?: string;
  }
): Promise<string> {
  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
  });

  if (!visitor) {
    throw new Error("Visitor not found");
  }

  if (visitor.status !== "CHECKED_IN") {
    throw new Error("Visitor must be checked in to grant area access");
  }

  const area = await prisma.area.findUnique({
    where: { id: areaId },
  });

  if (!area) {
    throw new Error("Area not found");
  }

  // Check security clearance
  if (area.requiresClearance && area.minClearance) {
    const clearanceLevel = getSecurityLevelValue(visitor.securityLabel);
    const requiredLevel = getSecurityLevelValue(area.minClearance);
    if (clearanceLevel < requiredLevel) {
      throw new Error("Visitor does not have required security clearance");
    }
  }

  // Calculate expiration (default: end of visit or 8 hours, whichever is earlier)
  const expiresAt = options?.expiresAt || (() => {
    const end = new Date(visitor.scheduledEnd);
    const maxExpiry = new Date();
    maxExpiry.setHours(maxExpiry.getHours() + 8);
    return end < maxExpiry ? end : maxExpiry;
  })();

  const access = await prisma.visitorAreaAccess.create({
    data: {
      visitorId,
      areaId,
      expiresAt,
      requiresEscort: options?.requiresEscort ?? area.requiresEscort,
      escortId: options?.escortId,
      active: true,
    },
  });

  // Log access grant
  await logAccess("ENTRY", {
    visitorId,
    location: area.name,
    metadata: {
      areaId,
      accessId: access.id,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return access.id;
}

/**
 * Revoke area access
 */
export async function revokeAreaAccess(
  accessId: string,
  revokedBy: string,
  reason?: string
): Promise<void> {
  const access = await prisma.visitorAreaAccess.findUnique({
    where: { id: accessId },
    include: { area: true },
  });

  if (!access) {
    throw new Error("Area access not found");
  }

  await prisma.visitorAreaAccess.update({
    where: { id: accessId },
    data: {
      active: false,
      revokedAt: new Date(),
      revokedBy,
      revokedReason: reason,
    },
  });

  // Log access revocation
  await logAccess("EXIT", {
    visitorId: access.visitorId,
    location: access.area.name,
    metadata: {
      reason,
      revokedBy,
    },
  });
}

/**
 * Check if visitor has access to area
 */
export async function checkAreaAccess(
  visitorId: string,
  areaId: string
): Promise<{
  allowed: boolean;
  reason?: string;
  requiresEscort?: boolean;
  escortId?: string;
}> {
  const access = await prisma.visitorAreaAccess.findFirst({
    where: {
      visitorId,
      areaId,
      active: true,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      area: true,
    },
  });

  if (!access) {
    return {
      allowed: false,
      reason: "No active access granted for this area",
    };
  }

  // Check if escort is required
  if (access.requiresEscort && !access.escorted) {
    return {
      allowed: false,
      reason: "Escort required for this area",
      requiresEscort: true,
      escortId: access.escortId || undefined,
    };
  }

  return {
    allowed: true,
    requiresEscort: access.requiresEscort,
    escortId: access.escortId || undefined,
  };
}

/**
 * Automatically revoke access after visit
 */
export async function revokeAccessAfterVisit(visitorId: string): Promise<{
  revoked: number;
}> {
  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
  });

  if (!visitor || visitor.status !== "CHECKED_OUT") {
    return { revoked: 0 };
  }

  // Revoke all active area access
  const result = await prisma.visitorAreaAccess.updateMany({
    where: {
      visitorId,
      active: true,
    },
    data: {
      active: false,
      revokedAt: new Date(),
      revokedBy: "SYSTEM",
      revokedReason: "Visit completed - automatic revocation",
    },
  });

  // Revoke digital access
  await prisma.visitorDigitalAccess.updateMany({
    where: {
      visitorId,
      active: true,
    },
    data: {
      active: false,
    },
  });

  return { revoked: result.count };
}

/**
 * Get security level value for comparison
 */
function getSecurityLevelValue(level: SecurityLevel): number {
  const levels: Record<SecurityLevel, number> = {
    PUBLIC: 0,
    INTERNAL: 1,
    CONFIDENTIAL: 2,
    RESTRICTED: 3,
    TOP_SECRET: 4,
  };
  return levels[level] || 0;
}



