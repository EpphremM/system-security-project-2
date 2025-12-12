import { NextRequest, NextResponse } from "next/server";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Edge-compatible crypto functions using Web Crypto API
async function createHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

// Rate limiters per endpoint (for API routes, not middleware)
const rateLimiters: Record<string, RateLimiterMemory> = {
  default: new RateLimiterMemory({
    points: 100,
    duration: 60,
  }),
  auth: new RateLimiterMemory({
    points: 5,
    duration: 60,
    blockDuration: 300,
  }),
  sensitive: new RateLimiterMemory({
    points: 10,
    duration: 60,
    blockDuration: 600,
  }),
  public: new RateLimiterMemory({
    points: 1000,
    duration: 60,
  }),
};

/**
 * Rate limit middleware (for API routes, not Edge middleware)
 * Note: This uses RateLimiterMemory which requires Node.js runtime
 * For Edge middleware, use the edgeRateLimit function in middleware.ts
 */
export async function rateLimit(
  request: NextRequest,
  endpoint: string = "default"
): Promise<{
  allowed: boolean;
  response?: NextResponse;
  retryAfter?: number;
}> {
  const ip = request.ip ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimiters[endpoint] || rateLimiters.default;

  try {
    await limiter.consume(ip);
    return { allowed: true };
  } catch (error: any) {
    const retryAfter = Math.round(error.msBeforeNext / 1000) || 60;
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Too many requests",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": limiter.points.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(Date.now() + retryAfter * 1000).toISOString(),
          },
        }
      ),
      retryAfter,
    };
  }
}

/**
 * Verify API key
 */
export async function verifyAPIKey(
  apiKey: string
): Promise<{
  valid: boolean;
  keyId?: string;
  permissions?: string[];
  error?: string;
}> {
  // Hash the API key
  const keyHash = await createHash(apiKey);

  // In production, store API keys in database
  // For now, check against environment variable
  const validKey = process.env.API_KEY;
  if (validKey) {
    const validHash = await createHash(validKey);
    if (keyHash === validHash) {
      return {
        valid: true,
        keyId: "default",
        permissions: ["read", "write"],
      };
    }
  }

  // Check database for API keys (if implemented)
  // const apiKeyRecord = await prisma.apiKey.findUnique({
  //   where: { keyHash },
  // });
  // if (apiKeyRecord && apiKeyRecord.active) {
  //   return {
  //     valid: true,
  //     keyId: apiKeyRecord.id,
  //     permissions: apiKeyRecord.permissions,
  //   };
  // }

  return {
    valid: false,
    error: "Invalid API key",
  };
}

/**
 * API key authentication middleware
 */
export async function authenticateAPIKey(
  request: NextRequest
): Promise<{
  authenticated: boolean;
  response?: NextResponse;
  keyId?: string;
  permissions?: string[];
}> {
  const apiKey = request.headers.get("X-API-Key") || request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!apiKey) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      ),
    };
  }

  const verification = await verifyAPIKey(apiKey);
  if (!verification.valid) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: verification.error || "Invalid API key" },
        { status: 401 }
      ),
    };
  }

  return {
    authenticated: true,
    keyId: verification.keyId,
    permissions: verification.permissions,
  };
}

/**
 * Encrypt request/response data
 */
export async function encryptRequestData(
  data: string,
  keyId?: string
): Promise<{
  encrypted: string;
  keyId: string;
}> {
  // In production, use proper encryption
  // For now, return base64 encoded
  const encrypted = Buffer.from(data).toString("base64");
  return {
    encrypted,
    keyId: keyId || "default",
  };
}

/**
 * Decrypt request/response data
 */
export async function decryptRequestData(
  encrypted: string,
  keyId?: string
): Promise<string> {
  // In production, use proper decryption
  // For now, decode base64
  return Buffer.from(encrypted, "base64").toString("utf8");
}

/**
 * API versioning middleware
 */
export function checkAPIVersion(
  request: NextRequest,
  minVersion?: string,
  maxVersion?: string
): {
  valid: boolean;
  response?: NextResponse;
  version?: string;
} {
  const version = request.headers.get("X-API-Version") || request.nextUrl.searchParams.get("version") || "1.0";

  if (minVersion && compareVersions(version, minVersion) < 0) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          error: `API version ${version} is not supported. Minimum version: ${minVersion}`,
        },
        { status: 400 }
      ),
    };
  }

  if (maxVersion && compareVersions(version, maxVersion) > 0) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          error: `API version ${version} is not supported. Maximum version: ${maxVersion}`,
        },
        { status: 400 }
      ),
    };
  }

  return {
    valid: true,
    version,
  };
}

/**
 * Compare version strings
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

/**
 * Generate CSRF token
 */
export async function generateCSRFToken(): Promise<string> {
  const randomData = Array.from(randomBytes(32))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const data = randomData + Date.now().toString();
  return await createHash(data);
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, sessionToken?: string): boolean {
  // In production, verify against session token
  // For now, basic validation
  return token.length === 64 && /^[a-f0-9]+$/.test(token);
}

