import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { evaluateABACPolicy } from "@/lib/access/abac";
import { extractClientMetadata } from "@/lib/utils/bot-prevention";
import { prisma } from "@/lib/prisma";


export async function enforceABAC(
  request: NextRequest,
  resourceType: string,
  resourceId: string,
  action: string,
  context?: {
    networkSecurityLevel?: string;
    threatIntelligenceScore?: number;
    systemMaintenanceStatus?: string;
  }
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
        policyType: "ABAC",
        enabled: true,
      },
      orderBy: {
        priority: "desc",
      },
    });

    if (policies.length === 0) {
      
      return { allowed: true };
    }

    
    const metadata = extractClientMetadata(request);

    
    for (const policy of policies) {
      if (!policy.attributes) {
        continue;
      }

      const result = await evaluateABACPolicy(
        policy.id,
        session.user.id,
        resourceType,
        resourceId,
        {
          ipAddress: metadata.ipAddress,
          currentTime: new Date(),
          networkSecurityLevel: context?.networkSecurityLevel,
          threatIntelligenceScore: context?.threatIntelligenceScore,
          systemMaintenanceStatus: context?.systemMaintenanceStatus,
        }
      );

      if (!result.allowed) {
        return {
          allowed: false,
          response: NextResponse.json(
            {
              error: "Access denied by ABAC policy",
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
    console.error("ABAC enforcement error:", error);
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Failed to check access policies",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      ),
    };
  }
}

