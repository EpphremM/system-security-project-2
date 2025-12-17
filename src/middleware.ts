import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { addSecurityHeaders } from "@/middleware/security";
import { isIPWhitelisted, isCountryBlocked } from "@/lib/security/network";


const rateLimiters: Map<string, { count: number; resetAt: number }> = new Map();

async function edgeRateLimit(
  request: NextRequest,
  endpoint: string = "default"
): Promise<{
  allowed: boolean;
  response?: NextResponse;
  retryAfter?: number;
}> {
  const ip = request.ip ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const key = `${endpoint}:${ip}`;
  const now = Date.now();

  

  const limits: Record<string, { points: number; duration: number }> = {
    default: { points: 100, duration: 600 },
    auth: { points: 15, duration: 600 },
    sensitive: { points: 10, duration: 600 },
    public: { points: 1000, duration: 600 },
  };1

  const limit = limits[endpoint] || limits.default;
  const record = rateLimiters.get(key);

  if (!record || now > record.resetAt) {
    

    rateLimiters.set(key, {
      count: 1,
      resetAt: now + limit.duration,
    });
    return { allowed: true };
  }

  if (record.count >= limit.points) {
    

    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
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
            "X-RateLimit-Limit": limit.points.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(record.resetAt).toISOString(),
          },
        }
      ),
      retryAfter,
    };
  }

  record.count++;
  rateLimiters.set(key, record);

  return { allowed: true };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  

  const ip = request.ip ?? request.headers.get("x-forwarded-for") ?? "unknown";
  
  

  if (pathname.startsWith("/api/admin") || pathname.startsWith("/admin")) {
    const adminIPs = process.env.ADMIN_IPS?.split(",") || [];
    if (adminIPs.length > 0 && !isIPWhitelisted(ip, adminIPs)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }
  }

  

  const blockedCountries = process.env.BLOCKED_COUNTRIES?.split(",") || [];
  if (blockedCountries.length > 0) {
    const isBlocked = await isCountryBlocked(ip, blockedCountries);
    if (isBlocked) {
      return NextResponse.json(
        { error: "Access denied from your location" },
        { status: 403 }
      );
    }
  }

  

  if (pathname.startsWith("/api/")) {
    

    let endpoint = "default";
    if (pathname.startsWith("/api/auth")) {
      endpoint = "auth";
    } else if (pathname.includes("/sensitive") || pathname.includes("/admin")) {
      endpoint = "sensitive";
    } else if (pathname.startsWith("/api/public")) {
      endpoint = "public";
    }

    const rateLimitResult = await edgeRateLimit(request, endpoint);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }
  }

  

  const response = NextResponse.next();
  addSecurityHeaders(response);

  return response;
}

export const config = {
  matcher: [
    
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


