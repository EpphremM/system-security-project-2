import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { evaluateABACPolicy } from "@/lib/access/abac";
import { extractClientMetadata } from "@/lib/utils/bot-prevention";

const evaluateSchema = z.object({
  policyId: z.string().uuid(),
  resourceType: z.string(),
  resourceId: z.string(),
  networkSecurityLevel: z.string().optional(),
  threatIntelligenceScore: z.number().optional(),
  systemMaintenanceStatus: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const metadata = extractClientMetadata(request);
    const body = await request.json();
    const parsed = evaluateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      policyId,
      resourceType,
      resourceId,
      networkSecurityLevel,
      threatIntelligenceScore,
      systemMaintenanceStatus,
    } = parsed.data;

    const result = await evaluateABACPolicy(
      policyId,
      session.user.id,
      resourceType,
      resourceId,
      {
        ipAddress: metadata.ipAddress,
        currentTime: new Date(),
        networkSecurityLevel,
        threatIntelligenceScore,
        systemMaintenanceStatus,
      }
    );

    if (!result.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          reason: result.reason,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      allowed: true,
    });
  } catch (error) {
    console.error("Evaluate ABAC policy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to evaluate policy" },
      { status: 500 }
    );
  }
}



