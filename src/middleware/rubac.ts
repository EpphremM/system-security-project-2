import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { evaluateAccessRule } from "@/lib/access/rubac";
import { extractClientMetadata } from "@/lib/utils/bot-prevention";
import { prisma } from "@/lib/prisma";


export async function enforceRuBAC(
  request: NextRequest,
  resourceType: string,
  resourceId: string,
  action: string
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  try {
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { legacyRole: true },
    });

    if (user?.legacyRole === "SUPER_ADMIN") {
      return { allowed: true };
    }

    
    const policies = await prisma.accessPolicy.findMany({
      where: {
        resource: resourceType,
        action,
        policyType: "RuBAC",
        enabled: true,
      },
      include: {
        rule: true,
      },
      orderBy: {
        priority: "desc",
      },
    });

    if (policies.length === 0) {
      
      return { allowed: true };
    }

    
    const metadata = extractClientMetadata(request);

    
    const deviceId = request.headers.get("x-device-id") || undefined;
    let deviceProfile = null;
    if (deviceId) {
      deviceProfile = await prisma.deviceProfile.findUnique({
        where: { deviceId },
      });
    }

    
    for (const policy of policies) {
      if (!policy.rule || !policy.rule.enabled) {
        continue;
      }

      const result = await evaluateAccessRule(policy.rule.id, {
        ipAddress: metadata.ipAddress,
        userId: session.user.id,
        deviceId,
        deviceInfo: deviceProfile
          ? {
              os: deviceProfile.os,
              osVersion: deviceProfile.osVersion,
              browser: deviceProfile.browser,
              browserVersion: deviceProfile.browserVersion,
              userAgent: deviceProfile.userAgent,
            }
          : undefined,
        geoLocation: metadata.location
          ? {
              country: metadata.location.country,
              city: metadata.location.city,
            }
          : undefined,
        currentTime: new Date(),
      });

      if (!result.allowed) {
        return {
          allowed: false,
          response: NextResponse.json(
            {
              error: "Access denied by rule",
              reason: result.reason,
              policy: policy.name,
            },
            { status: 403 }
          ),
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("RuBAC enforcement error:", error);
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Failed to check access rules",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      ),
    };
  }
}

