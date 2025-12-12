import { prisma } from "@/lib/prisma";
import { DeviceType, TrustLevel } from "@/generated/prisma/enums";

/**
 * Register or update device profile
 */
export async function registerDevice(
  userId: string,
  deviceId: string,
  deviceInfo: {
    deviceName?: string;
    deviceType: DeviceType;
    os?: string;
    osVersion?: string;
    browser?: string;
    browserVersion?: string;
    userAgent?: string;
    ipAddress?: string;
    isCompanyManaged?: boolean;
    hasAntiMalware?: boolean;
    hasEncryptedStorage?: boolean;
  }
) {
  // Get existing device if any
  const existing = await prisma.deviceProfile.findUnique({
    where: { deviceId },
  });

  const device = await prisma.deviceProfile.upsert({
    where: { deviceId },
    create: {
      userId,
      deviceId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion,
      isCompanyManaged: deviceInfo.isCompanyManaged ?? false,
      hasAntiMalware: deviceInfo.hasAntiMalware ?? false,
      hasEncryptedStorage: deviceInfo.hasEncryptedStorage ?? false,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      trustLevel: "UNKNOWN",
      lastSeen: new Date(),
    },
    update: {
      deviceName: deviceInfo.deviceName,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion,
      isCompanyManaged: deviceInfo.isCompanyManaged ?? existing?.isCompanyManaged ?? false,
      hasAntiMalware: deviceInfo.hasAntiMalware ?? existing?.hasAntiMalware ?? false,
      hasEncryptedStorage: deviceInfo.hasEncryptedStorage ?? existing?.hasEncryptedStorage ?? false,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      lastSeen: new Date(),
      updatedAt: new Date(),
    },
  });

  return device;
}

/**
 * Update device trust level
 */
export async function updateDeviceTrustLevel(
  deviceId: string,
  trustLevel: TrustLevel,
  updatedBy: string
) {
  const device = await prisma.deviceProfile.update({
    where: { deviceId },
    data: {
      trustLevel,
      updatedAt: new Date(),
    },
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      userId: updatedBy,
      action: "device.trust_level_updated",
      resource: "device",
      resourceId: deviceId,
      securityLabel: "INTERNAL",
      details: {
        trustLevel,
      },
    },
  });

  return device;
}

/**
 * Get user devices
 */
export async function getUserDevices(userId: string) {
  return await prisma.deviceProfile.findMany({
    where: { userId },
    orderBy: {
      lastSeen: "desc",
    },
  });
}

/**
 * Block device
 */
export async function blockDevice(deviceId: string, blockedBy: string, reason?: string) {
  const device = await prisma.deviceProfile.update({
    where: { deviceId },
    data: {
      trustLevel: "BLOCKED",
      updatedAt: new Date(),
    },
  });

  // Log audit event
  await prisma.auditLog.create({
    data: {
      userId: blockedBy,
      action: "device.blocked",
      resource: "device",
      resourceId: deviceId,
      securityLabel: "INTERNAL",
      details: {
        reason,
      },
    },
  });

  return device;
}

