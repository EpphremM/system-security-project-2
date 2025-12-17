import { prisma } from "@/lib/prisma";
import { RuleType, HolidayType, DeviceType, TrustLevel } from "@/generated/prisma/enums";


export interface TimeRuleConfig {
  workingHours?: {
    start: string; 
    end: string; 
  };
  daysOfWeek?: number[]; 
  timezone?: string; 
  excludeHolidays?: boolean;
  emergencyOverride?: boolean;
}

export function evaluateTimeRule(
  config: TimeRuleConfig,
  currentTime: Date = new Date()
): { allowed: boolean; reason?: string } {
  
  

  
  if (config.emergencyOverride) {
    return { allowed: true };
  }

  
  const hour = currentTime.getHours();
  const minute = currentTime.getMinutes();
  const dayOfWeek = currentTime.getDay();
  const currentTimeMinutes = hour * 60 + minute;

  
  if (config.daysOfWeek && config.daysOfWeek.length > 0) {
    if (!config.daysOfWeek.includes(dayOfWeek)) {
      return {
        allowed: false,
        reason: `Access not allowed on ${getDayName(dayOfWeek)}`,
      };
    }
  }

  

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

  

  

  


  return { allowed: true };
}


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


export interface LocationRuleConfig {
  ipWhitelist?: string[]; 

  ipWhitelistIds?: string[]; 

  requireVPN?: boolean;
  allowedCountries?: string[]; 

  blockedCountries?: string[]; 

  requireOfficeNetwork?: boolean;
  emergencyOverride?: boolean;
}

export async function evaluateLocationRule(
  config: LocationRuleConfig,
  ipAddress: string,
  userAgent?: string,
  geoLocation?: { country?: string; city?: string }
): Promise<{ allowed: boolean; reason?: string }> {
  

  if (config.emergencyOverride) {
    return { allowed: true };
  }

  

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

  

  if (config.requireVPN) {
    

    

    

    const isVPN = await checkVPNConnection(ipAddress);
    if (!isVPN) {
      return {
        allowed: false,
        reason: "VPN connection required",
      };
    }
  }

  

  if (config.requireOfficeNetwork) {
    

    const isOfficeNetwork = await checkOfficeNetwork(ipAddress);
    if (!isOfficeNetwork) {
      return {
        allowed: false,
        reason: "Office network connection required",
      };
    }
  }

  

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


export interface DeviceRuleConfig {
  requireCompanyManaged?: boolean;
  requireOS?: string[]; 

  requireOSVersion?: { os: string; minVersion: string }[];
  requireBrowser?: string[]; 

  requireBrowserVersion?: { browser: string; minVersion: string }[];
  requireAntiMalware?: boolean;
  requireEncryptedStorage?: boolean;
  minTrustLevel?: TrustLevel;
  blockedDevices?: string[]; 

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
  

  if (config.emergencyOverride) {
    return { allowed: true };
  }

  

  let deviceProfile = null;
  if (deviceId) {
    deviceProfile = await prisma.deviceProfile.findUnique({
      where: { deviceId },
    });
  }

  

  if (config.blockedDevices && deviceId && config.blockedDevices.includes(deviceId)) {
    return {
      allowed: false,
      reason: "Device is blocked",
    };
  }

  

  if (config.requireCompanyManaged) {
    if (!deviceProfile || !deviceProfile.isCompanyManaged) {
      return {
        allowed: false,
        reason: "Company-managed device required",
      };
    }
  }

  

  if (config.requireOS && config.requireOS.length > 0) {
    const os = deviceInfo?.os || deviceProfile?.os;
    if (!os || !config.requireOS.includes(os)) {
      return {
        allowed: false,
        reason: `Required OS: ${config.requireOS.join(", ")}`,
      };
    }
  }

  

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

  

  if (config.requireBrowser && config.requireBrowser.length > 0) {
    const browser = deviceInfo?.browser || deviceProfile?.browser;
    if (!browser || !config.requireBrowser.includes(browser)) {
      return {
        allowed: false,
        reason: `Required browser: ${config.requireBrowser.join(", ")}`,
      };
    }
  }

  

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

  

  if (config.requireAntiMalware) {
    if (!deviceProfile || !deviceProfile.hasAntiMalware) {
      return {
        allowed: false,
        reason: "Anti-malware software required",
      };
    }
  }

  

  if (config.requireEncryptedStorage) {
    if (!deviceProfile || !deviceProfile.hasEncryptedStorage) {
      return {
        allowed: false,
        reason: "Encrypted storage required",
      };
    }
  }

  

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
    return { allowed: true }; 

  }

  

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




function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day];
}

function isIPInRange(ip: string, range: string): boolean {
  

  if (range.includes("/")) {
    const [network, prefixLength] = range.split("/");
    

    return ip.startsWith(network.split(".").slice(0, parseInt(prefixLength) / 8).join("."));
  }
  return ip === range;
}

async function checkVPNConnection(ipAddress: string): Promise<boolean> {
  

  

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
  

  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) return true;
    if (v1Part < v2Part) return false;
  }

  return true; 

}



