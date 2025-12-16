import { NextRequest } from "next/server";
import { authRateLimiter } from "./rate-limiter";

export interface SubmissionMetadata {
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  formFillTime?: number; 
  mouseMovements?: number;
  keystrokes?: number;
  deviceFingerprint?: string;
}

export interface BehavioralScore {
  score: number; 
  reasons: string[];
}


export function calculateBehavioralScore(metadata: SubmissionMetadata): BehavioralScore {
  const reasons: string[] = [];
  let score = 0;

  
  if (metadata.formFillTime && metadata.formFillTime < 2000) {
    score += 30;
    reasons.push("Form filled too quickly");
  }

  
  if (!metadata.mouseMovements || metadata.mouseMovements < 5) {
    score += 20;
    reasons.push("Insufficient mouse movements");
  }

  if (!metadata.keystrokes || metadata.keystrokes < 10) {
    score += 20;
    reasons.push("Insufficient keystrokes");
  }

  
  if (metadata.userAgent) {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /headless/i,
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(metadata.userAgent))) {
      score += 40;
      reasons.push("Suspicious user agent");
    }
  }

  
  if (!metadata.deviceFingerprint) {
    score += 10;
    reasons.push("Missing device fingerprint");
  }

  return {
    score: Math.min(score, 100),
    reasons,
  };
}


export function shouldBlockSubmission(score: BehavioralScore): boolean {
  return score.score >= 70; 
}


export async function checkRegistrationRateLimit(
  ipAddress: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    await authRateLimiter.consume(ipAddress);
    return { allowed: true };
  } catch (error: any) {
    const retryAfter = Math.round(error.msBeforeNext / 1000) || 60;
    return { allowed: false, retryAfter };
  }
}


export function extractClientMetadata(request: NextRequest): SubmissionMetadata {
  const ipAddress =
    request.ip ??
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const userAgent = request.headers.get("user-agent") ?? "";

  return {
    ipAddress,
    userAgent,
    timestamp: Date.now(),
  };
}


export function generateDeviceFingerprint(request: NextRequest): string {
  const headers = {
    "user-agent": request.headers.get("user-agent") ?? "",
    "accept-language": request.headers.get("accept-language") ?? "",
    "accept-encoding": request.headers.get("accept-encoding") ?? "",
  };

  
  const fingerprint = JSON.stringify(headers);
  return Buffer.from(fingerprint).toString("base64").substring(0, 32);
}


export function calculateSubmissionDelay(
  firstSubmissionTime: number,
  currentTime: number
): number {
  const elapsed = currentTime - firstSubmissionTime;
  const minDelay = 3000; 

  if (elapsed < minDelay) {
    return minDelay - elapsed;
  }

  return 0;
}





