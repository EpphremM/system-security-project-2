import { NextRequest } from "next/server";

/**
 * Check if IP is whitelisted
 */
export function isIPWhitelisted(
  ipAddress: string,
  whitelist: string[]
): boolean {
  for (const allowed of whitelist) {
    if (allowed.includes("/")) {
      // CIDR notation
      if (isIPInCIDR(ipAddress, allowed)) {
        return true;
      }
    } else {
      // Exact match
      if (ipAddress === allowed) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if IP is in CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  const [network, prefixLength] = cidr.split("/");
  const prefix = parseInt(prefixLength, 10);

  const ipParts = ip.split(".").map(Number);
  const networkParts = network.split(".").map(Number);

  const mask = (0xffffffff << (32 - prefix)) >>> 0;

  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const networkNum = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3];

  return (ipNum & mask) === (networkNum & mask);
}

/**
 * Check if country is blocked
 */
export async function isCountryBlocked(
  ipAddress: string,
  blockedCountries: string[]
): Promise<boolean> {
  // In production, use GeoIP service
  // For now, return false
  return false;
}

/**
 * Get country from IP
 */
export async function getCountryFromIP(ipAddress: string): Promise<string | null> {
  // In production, use GeoIP service (e.g., MaxMind, ipapi.co)
  // For now, return null
  return null;
}

/**
 * Check TLS version (client-side check)
 */
export function checkTLSVersion(request: NextRequest): {
  valid: boolean;
  version?: string;
} {
  // TLS version is determined by the server configuration
  // This is a placeholder for client-side checks
  const protocol = request.headers.get("x-forwarded-proto");
  if (protocol === "https") {
    return {
      valid: true,
      version: "TLS 1.3", // Assumed if HTTPS
    };
  }
  return {
    valid: false,
  };
}

/**
 * Validate certificate pinning
 */
export function validateCertificatePinning(
  certificateHash: string,
  pinnedHashes: string[]
): boolean {
  return pinnedHashes.includes(certificateHash);
}

/**
 * Generate firewall rule configuration
 */
export function generateFirewallRules(options: {
  adminIPs: string[];
  blockedCountries: string[];
  allowedPorts: number[];
  blockedPorts: number[];
}): string {
  // Generate firewall rules in iptables format
  const rules: string[] = [];

  // Allow admin IPs
  for (const ip of options.adminIPs) {
    rules.push(`-A INPUT -s ${ip} -j ACCEPT`);
  }

  // Block specific ports
  for (const port of options.blockedPorts) {
    rules.push(`-A INPUT -p tcp --dport ${port} -j DROP`);
  }

  // Allow specific ports
  for (const port of options.allowedPorts) {
    rules.push(`-A INPUT -p tcp --dport ${port} -j ACCEPT`);
  }

  return rules.join("\n");
}

/**
 * DDoS protection configuration
 */
export interface DDoSProtectionConfig {
  maxConnectionsPerIP: number;
  maxRequestsPerMinute: number;
  blockDuration: number; // seconds
  whitelistIPs: string[];
}

export function getDDoSProtectionConfig(): DDoSProtectionConfig {
  return {
    maxConnectionsPerIP: 10,
    maxRequestsPerMinute: 60,
    blockDuration: 300, // 5 minutes
    whitelistIPs: process.env.ADMIN_IPS?.split(",") || [],
  };
}



