import { prisma } from "@/lib/prisma";
import { RuleType, HolidayType, DeviceType, TrustLevel } from "@/generated/prisma/enums";

/**
 * Time-based rule evaluation
 */
export interface TimeRuleConfig {
  workingHours?: {
    start: string; // "HH:mm" format, e.g., "08:00"
    end: string; // "HH:mm" format, e.g., "18:00"
  };
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  timezone?: string; // IANA timezone, e.g., "America/New_York"
  excludeHolidays?: boolean;
  emergencyOverride?: boolean;
}

export function evaluateTimeRule(
  config: TimeRuleConfig,
  currentTime: Date = new Date()
): { allowed: boolean; reason?: string } {
  // Check if rule is valid (validFrom/validUntil)
  // This would be checked at the rule level, not here

  // Check emergency override
  if (config.emergencyOverride) {
    return { allowed: true };
  }

  // Get current time components
  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();
  const dayOfWeek = currentTime.getDay();
  const currentTimeMinutes = hour * 60 + minute;

  // Check days of week
  if (config.daysOfWeek && config.daysOfWeek.length > 0) {
    if (!config.daysOfWeek.includes(dayOfWeek)) {
      return {
        allowed: false,
        reason: `Access not allowed on ${getDayName(dayOfWeek)}`,
      };
    }
  }

  // Check working hours
  if (config.workingHours) {
    const startMinutes = parseTime(config.workingHours.start);
    const endMinutes = parseTime(config.workingHours.end);

    if (currentTimeMinutes < startMinutes || currentTimeMinutes >= endMinutes) {
      return {
        allowed: false,
        reason: `Access only allowed between ${config.workingHours.start} and ${config.workingHours.end}`,
      };
    }
  }

  // Check holidays (if excludeHolidays is true)
  // This would require checking against HolidaySchedule
  // For now, we'll return allowed and check holidays separately

  return { allowed: true };
}

/**
 * Check if current date is a holiday
 */
export async function isHoliday(
  date: Date = new Date(),
  excludeTypes: HolidayType[] = []
): Promise<boolean> {
  const holidays = await prisma.holidaySchedule.findMany({
    where: {
      startDate: { lte: date },
      endDate: { gte: date },
      type: {
        notIn: excludeTypes,
      },
    },
  });

  return holidays.length > 0;
}

/**
 * Location-based rule evaluation
 */
export interface LocationRuleConfig {
  ipWhitelist?: string[]; // IP ranges in CIDR notation
  ipWhitelistIds?: string[]; // IDs of IPWhitelist entries
  requireVPN?: boolean;
  allowedCountries?: string[]; // ISO country codes
  blockedCountries?: string[]; // ISO country codes
  requireOfficeNetwork?: boolean;
  emergencyOverride?: boolean;
}

export async function evaluateLocationRule(
  config: LocationRuleConfig,
  ipAddress: string,
  userAgent?: string,
  geoLocation?: { country?: string; city?: string }
): Promise<{ allowed: boolean; reason?: string }> {
  // Check emergency override
  if (config.emergencyOverride) {
    return { allowed: true };
  }

  // Check IP whitelist
  if (config.ipWhitelistIds && config.ipWhitelistIds.length > 0) {
    const whitelists = await prisma.iPWhitelist.findMany({
      where: {
        id: { in: config.ipWhitelistIds },
        enabled: true,
      },
    });

    let ipAllowed = false;
    for (const whitelist of whitelists) {
      for (const range of whitelist.ipRanges) {
        if (isIPInRange(ipAddress, range)) {
          ipAllowed = true;
          break;
        }
      }
      if (ipAllowed) break;
    }

    if (!ipAllowed) {
      return {
        allowed: false,
        reason: "IP address not in whitelist",
      };
    }
  } else if (config.ipWhitelist && config.ipWhitelist.length > 0) {
    let ipAllowed = false;
    for (const range of config.ipWhitelist) {
      if (isIPInRange(ipAddress, range)) {
        ipAllowed = true;
        break;
      }
    }

    if (!ipAllowed) {
      return {
        allowed: false,
        reason: "IP address not in whitelist",
      };
    }
  }

  // Check VPN requirement
  if (config.requireVPN) {
    // Check if IP is from VPN (this would require VPN network configuration)
    // For now, we'll assume VPN IPs are in a specific range
    // In production, you'd check against VPN network configuration
    const isVPN = await checkVPNConnection(ipAddress);
    if (!isVPN) {
      return {
        allowed: false,
        reason: "VPN connection required",
      };
    }
  }

  // Check office network requirement
  if (config.requireOfficeNetwork) {
    // Check if IP is from office network
    const isOfficeNetwork = await checkOfficeNetwork(ipAddress);
    if (!isOfficeNetwork) {
      return {
        allowed: false,
        reason: "Office network connection required",
      };
    }
  }

  // Check geographic restrictions
  if (geoLocation?.country) {
    if (config.blockedCountries?.includes(geoLocation.country)) {
      return {
        allowed: false,
        reason: `Access blocked from ${geoLocation.country}`,
      };
    }

    if (config.allowedCountries && config.allowedCountries.length > 0) {
      if (!config.allowedCountries.includes(geoLocation.country)) {
        return {
          allowed: false,
          reason: `Access not allowed from ${geoLocation.country}`,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Device-based rule evaluation
 */
export interface DeviceRuleConfig {
  requireCompanyManaged?: boolean;
  requireOS?: string[]; // e.g., ["Windows", "macOS", "Linux"]
  requireOSVersion?: { os: string; minVersion: string }[];
  requireBrowser?: string[]; // e.g., ["Chrome", "Firefox", "Safari"]
  requireBrowserVersion?: { browser: string; minVersion: string }[];
  requireAntiMalware?: boolean;
  requireEncryptedStorage?: boolean;
  minTrustLevel?: TrustLevel;
  blockedDevices?: string[]; // Device IDs
  emergencyOverride?: boolean;
}

export async function evaluateDeviceRule(
  config: DeviceRuleConfig,
  userId: string,
  deviceId?: string,
  deviceInfo?: {
    os?: string;
    osVersion?: string;
    browser?: string;
    browserVersion?: string;
    userAgent?: string;
  }
): Promise<{ allowed: boolean; reason?: string }> {
  // Check emergency override
  if (config.emergencyOverride) {
    return { allowed: true };
  }

  // Get device profile if deviceId provided
  let deviceProfile = null;
  if (deviceId) {
    deviceProfile = await prisma.deviceProfile.findUnique({
      where: { deviceId },
    });
  }

  // Check blocked devices
  if (config.blockedDevices && deviceId && config.blockedDevices.includes(deviceId)) {
    return {
      allowed: false,
      reason: "Device is blocked",
    };
  }

  // Check company-managed device requirement
  if (config.requireCompanyManaged) {
    if (!deviceProfile || !deviceProfile.isCompanyManaged) {
      return {
        allowed: false,
        reason: "Company-managed device required",
      };
    }
  }

  // Check OS requirements
  if (config.requireOS && config.requireOS.length > 0) {
    const os = deviceInfo?.os || deviceProfile?.os;
    if (!os || !config.requireOS.includes(os)) {
      return {
        allowed: false,
        reason: `Required OS: ${config.requireOS.join(", ")}`,
      };
    }
  }

  // Check OS version requirements
  if (config.requireOSVersion && config.requireOSVersion.length > 0) {
    const os = deviceInfo?.os || deviceProfile?.os;
    const osVersion = deviceInfo?.osVersion || deviceProfile?.osVersion;

    if (os && osVersion) {
      const requirement = config.requireOSVersion.find((r) => r.os === os);
      if (requirement && !compareVersions(osVersion, requirement.minVersion)) {
        return {
          allowed: false,
          reason: `OS version ${requirement.minVersion} or higher required`,
        };
      }
    }
  }

  // Check browser requirements
  if (config.requireBrowser && config.requireBrowser.length > 0) {
    const browser = deviceInfo?.browser || deviceProfile?.browser;
    if (!browser || !config.requireBrowser.includes(browser)) {
      return {
        allowed: false,
        reason: `Required browser: ${config.requireBrowser.join(", ")}`,
      };
    }
  }

  // Check browser version requirements
  if (config.requireBrowserVersion && config.requireBrowserVersion.length > 0) {
    const browser = deviceInfo?.browser || deviceProfile?.browser;
    const browserVersion = deviceInfo?.browserVersion || deviceProfile?.browserVersion;

    if (browser && browserVersion) {
      const requirement = config.requireBrowserVersion.find((r) => r.browser === browser);
      if (requirement && !compareVersions(browserVersion, requirement.minVersion)) {
        return {
          allowed: false,
          reason: `Browser version ${requirement.minVersion} or higher required`,
        };
      }
    }
  }

  // Check anti-malware requirement
  if (config.requireAntiMalware) {
    if (!deviceProfile || !deviceProfile.hasAntiMalware) {
      return {
        allowed: false,
        reason: "Anti-malware software required",
      };
    }
  }

  // Check encrypted storage requirement
  if (config.requireEncryptedStorage) {
    if (!deviceProfile || !deviceProfile.hasEncryptedStorage) {
      return {
        allowed: false,
        reason: "Encrypted storage required",
      };
    }
  }

  // Check trust level
  if (config.minTrustLevel && deviceProfile) {
    const trustLevels: TrustLevel[] = ["BLOCKED", "UNTRUSTED", "UNKNOWN", "VERIFIED", "TRUSTED"];
    const currentLevel = trustLevels.indexOf(deviceProfile.trustLevel);
    const requiredLevel = trustLevels.indexOf(config.minTrustLevel);

    if (currentLevel < requiredLevel) {
      return {
        allowed: false,
        reason: `Minimum trust level required: ${config.minTrustLevel}`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Evaluate composite rule (multiple rule types)
 */
export async function evaluateCompositeRule(
  rules: Array<{
    type: RuleType;
    config: any;
  }>,
  context: {
    ipAddress: string;
    userId: string;
    deviceId?: string;
    deviceInfo?: any;
    geoLocation?: { country?: string; city?: string };
    currentTime?: Date;
  }
): Promise<{ allowed: boolean; reason?: string }> {
  // All rules must pass (AND logic)
  for (const rule of rules) {
    let result: { allowed: boolean; reason?: string };

    switch (rule.type) {
      case "TIME_BASED":
        result = evaluateTimeRule(rule.config, context.currentTime);
        break;

      case "LOCATION_BASED":
        result = await evaluateLocationRule(
          rule.config,
          context.ipAddress,
          context.deviceInfo?.userAgent,
          context.geoLocation
        );
        break;

      case "DEVICE_BASED":
        result = await evaluateDeviceRule(
          rule.config,
          context.userId,
          context.deviceId,
          context.deviceInfo
        );
        break;

      default:
        result = { allowed: true };
    }

    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

/**
 * Evaluate access rule
 */
export async function evaluateAccessRule(
  ruleId: string,
  context: {
    ipAddress: string;
    userId: string;
    deviceId?: string;
    deviceInfo?: any;
    geoLocation?: { country?: string; city?: string };
    currentTime?: Date;
  }
): Promise<{ allowed: boolean; reason?: string }> {
  const rule = await prisma.accessRule.findUnique({
    where: { id: ruleId },
  });

  if (!rule || !rule.enabled) {
    return { allowed: true }; // If rule doesn't exist or is disabled, allow access
  }

  // Check validity period
  if (rule.validFrom && context.currentTime && context.currentTime < rule.validFrom) {
    return {
      allowed: false,
      reason: "Rule not yet valid",
    };
  }

  if (rule.validUntil && context.currentTime && context.currentTime > rule.validUntil) {
    return {
      allowed: false,
      reason: "Rule has expired",
    };
  }

  // Evaluate based on rule type
  const config = rule.config as any;

  switch (rule.ruleType) {
    case "TIME_BASED":
      return evaluateTimeRule(config, context.currentTime);

    case "LOCATION_BASED":
      return await evaluateLocationRule(
        config,
        context.ipAddress,
        context.deviceInfo?.userAgent,
        context.geoLocation
      );

    case "DEVICE_BASED":
      return await evaluateDeviceRule(
        config,
        context.userId,
        context.deviceId,
        context.deviceInfo
      );

    case "COMPOSITE":
      return await evaluateCompositeRule(config.rules, context);

    default:
      return { allowed: true };
  }
}

// Helper functions

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day];
}

function isIPInRange(ip: string, range: string): boolean {
  // Simple CIDR check (for production, use a proper CIDR library)
  if (range.includes("/")) {
    const [network, prefixLength] = range.split("/");
    // This is a simplified check - use a proper CIDR library in production
    return ip.startsWith(network.split(".").slice(0, parseInt(prefixLength) / 8).join("."));
  }
  return ip === range;
}

async function checkVPNConnection(ipAddress: string): Promise<boolean> {
  // Check if IP is from VPN network
  // In production, check against VPN network configuration
  const vpnNetworks = await prisma.iPWhitelist.findMany({
    where: {
      location: { contains: "VPN" },
      enabled: true,
    },
  });

  for (const network of vpnNetworks) {
    for (const range of network.ipRanges) {
      if (isIPInRange(ipAddress, range)) {
        return true;
      }
    }
  }

  return false;
}

async function checkOfficeNetwork(ipAddress: string): Promise<boolean> {
  // Check if IP is from office network
  const officeNetworks = await prisma.iPWhitelist.findMany({
    where: {
      location: { contains: "Office" },
      enabled: true,
    },
  });

  for (const network of officeNetworks) {
    for (const range of network.ipRanges) {
      if (isIPInRange(ipAddress, range)) {
        return true;
      }
    }
  }

  return false;
}

function compareVersions(version1: string, version2: string): boolean {
  // Simple version comparison (for production, use a proper version comparison library)
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) return true;
    if (v1Part < v2Part) return false;
  }

  return true; // Versions are equal
}



