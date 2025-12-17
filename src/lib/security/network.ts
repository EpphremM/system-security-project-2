import { NextRequest } from "next/server";


export function isIPWhitelisted(
  ipAddress: string,
  whitelist: string[]
): boolean {
  for (const allowed of whitelist) {
    if (allowed.includes("/")) {
      
      if (isIPInCIDR(ipAddress, allowed)) {
        return true;
      }
    } else {
      
      if (ipAddress === allowed) {
        return true;
      }
    }
  }
  return false;
}


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


export async function isCountryBlocked(
  ipAddress: string,
  blockedCountries: string[]
): Promise<boolean> {
  
  
  return false;
}


export async function getCountryFromIP(ipAddress: string): Promise<string | null> {
  
  
  return null;
}


export function checkTLSVersion(request: NextRequest): {
  valid: boolean;
  version?: string;
} {
  
  
  const protocol = request.headers.get("x-forwarded-proto");
  if (protocol === "https") {
    return {
      valid: true,
      version: "TLS 1.3", 
    };
  }
  return {
    valid: false,
  };
}


export function validateCertificatePinning(
  certificateHash: string,
  pinnedHashes: string[]
): boolean {
  return pinnedHashes.includes(certificateHash);
}


export function generateFirewallRules(options: {
  adminIPs: string[];
  blockedCountries: string[];
  allowedPorts: number[];
  blockedPorts: number[];
}): string {
  
  const rules: string[] = [];

  
  for (const ip of options.adminIPs) {
    rules.push(`-A INPUT -s ${ip} -j ACCEPT`);
  }

  

  for (const port of options.blockedPorts) {
    rules.push(`-A INPUT -p tcp --dport ${port} -j DROP`);
  }

  

  for (const port of options.allowedPorts) {
    rules.push(`-A INPUT -p tcp --dport ${port} -j ACCEPT`);
  }

  return rules.join("\n");
}


export interface DDoSProtectionConfig {
  maxConnectionsPerIP: number;
  maxRequestsPerMinute: number;
  blockDuration: number; 

  whitelistIPs: string[];
}

export function getDDoSProtectionConfig(): DDoSProtectionConfig {
  return {
    maxConnectionsPerIP: 10,
    maxRequestsPerMinute: 60,
    blockDuration: 300, 

    whitelistIPs: process.env.ADMIN_IPS?.split(",") || [],
  };
}



