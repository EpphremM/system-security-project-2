import { prisma } from "@/lib/prisma";
import { encryptLogData } from "@/lib/logging/encryption";


function randomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}


export async function createDigitalAccess(
  visitorId: string,
  options?: {
    wifiEnabled?: boolean;
    networkAccessEnabled?: boolean;
    webPortalEnabled?: boolean;
    printingEnabled?: boolean;
    bandwidthLimit?: number;
    printQuota?: number;
  }
): Promise<{
  wifiUsername?: string;
  wifiPassword?: string;
  webPortalToken?: string;
  webPortalUrl?: string;
}> {
  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
  });

  if (!visitor) {
    throw new Error("Visitor not found");
  }

  if (visitor.status !== "CHECKED_IN") {
    throw new Error("Visitor must be checked in to grant digital access");
  }

  
  let wifiUsername: string | undefined;
  let wifiPassword: string | undefined;
  let encryptedPassword: string | undefined;

  if (options?.wifiEnabled !== false) {
    wifiUsername = `visitor-${visitorId.substring(0, 8)}-${Date.now()}`;
    wifiPassword = generateSecurePassword(12);
    const encrypted = await encryptLogData(wifiPassword, "USER_ACTIVITY");
    encryptedPassword = JSON.stringify(encrypted);
  }

  // Generate web portal token
  const webPortalToken = options?.webPortalEnabled !== false
    ? generateSecureToken(32)
    : undefined;

  const webPortalUrl = webPortalToken
    ? `${process.env.NEXTAUTH_URL}/visitor-portal?token=${webPortalToken}`
    : undefined;

  // Calculate expiration (end of visit or 8 hours)
  const expiresAt = (() => {
    const end = new Date(visitor.scheduledEnd);
    const maxExpiry = new Date();
    maxExpiry.setHours(maxExpiry.getHours() + 8);
    return end < maxExpiry ? end : maxExpiry;
  })();

  // Create or update digital access
  await prisma.visitorDigitalAccess.upsert({
    where: { visitorId },
    create: {
      visitorId,
      wifiUsername,
      wifiPassword: encryptedPassword,
      wifiSSID: process.env.WIFI_SSID || "VISITOR_NETWORK",
      wifiExpiresAt: expiresAt,
      networkAccessEnabled: options?.networkAccessEnabled !== false,
      allowedIPs: [],
      blockedIPs: [],
      allowedPorts: [80, 443], // HTTP and HTTPS only
      blockedPorts: [],
      bandwidthLimit: options?.bandwidthLimit || 10, // 10 Mbps default
      webPortalEnabled: options?.webPortalEnabled !== false,
      webPortalUrl,
      webPortalToken,
      printingEnabled: options?.printingEnabled || false,
      printQuota: options?.printQuota || 10,
      printUsed: 0,
      active: true,
      expiresAt,
    },
    update: {
      wifiUsername,
      wifiPassword: encryptedPassword,
      wifiExpiresAt: expiresAt,
      networkAccessEnabled: options?.networkAccessEnabled,
      bandwidthLimit: options?.bandwidthLimit,
      webPortalEnabled: options?.webPortalEnabled,
      webPortalUrl,
      webPortalToken,
      printingEnabled: options?.printingEnabled,
      printQuota: options?.printQuota,
      active: true,
      expiresAt,
    },
  });

  return {
    wifiUsername,
    wifiPassword,
    webPortalToken,
    webPortalUrl,
  };
}

/**
 * Revoke digital access
 */
export async function revokeDigitalAccess(visitorId: string): Promise<void> {
  await prisma.visitorDigitalAccess.updateMany({
    where: {
      visitorId,
      active: true,
    },
    data: {
      active: false,
    },
  });
}

/**
 * Use print quota
 */
export async function usePrintQuota(
  visitorId: string,
  pages: number
): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const access = await prisma.visitorDigitalAccess.findUnique({
    where: { visitorId },
  });

  if (!access || !access.active || !access.printingEnabled) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  const newUsed = access.printUsed + pages;
  if (newUsed > (access.printQuota || 0)) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  await prisma.visitorDigitalAccess.update({
    where: { id: access.id },
    data: {
      printUsed: newUsed,
    },
  });

  return {
    allowed: true,
    remaining: (access.printQuota || 0) - newUsed,
  };
}

/**
 * Verify web portal token
 */
export async function verifyWebPortalToken(token: string): Promise<{
  valid: boolean;
  visitorId?: string;
  access?: any;
}> {
  const access = await prisma.visitorDigitalAccess.findUnique({
    where: { webPortalToken: token },
    include: { visitor: true },
  });

  if (!access || !access.active || !access.webPortalEnabled) {
    return { valid: false };
  }

  if (access.expiresAt < new Date()) {
    return { valid: false };
  }

  if (access.visitor.status !== "CHECKED_IN") {
    return { valid: false };
  }

  return {
    valid: true,
    visitorId: access.visitorId,
    access: {
      printingEnabled: access.printingEnabled,
      printQuota: access.printQuota,
      printUsed: access.printUsed,
    },
  };
}

/**
 * Generate secure password
 */
function generateSecurePassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

/**
 * Generate secure token
 */
function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

