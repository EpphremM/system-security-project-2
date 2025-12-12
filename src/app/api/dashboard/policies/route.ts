import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPolicyManagementData,
  testPolicy,
  deployPolicy,
  getPolicyAuditTrail,
} from "@/lib/dashboard/policy-management";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get("policyId");
    const view = searchParams.get("view");

    if (policyId && view === "audit") {
      const data = await getPolicyAuditTrail(policyId);
      return NextResponse.json({ auditTrail: data });
    } else {
      const data = await getPolicyManagementData();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Get policy management data error:", error);
    return NextResponse.json(
      { error: "Failed to get policy management data" },
      { status: 500 }
    );
  }
}

const testSchema = z.object({
  policyId: z.string().uuid(),
  userId: z.string().uuid(),
  resourceType: z.string(),
  resourceId: z.string(),
  action: z.string(),
  context: z.any().optional(),
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

    const body = await request.json();
    const action = body.action;

    if (action === "test") {
      const parsed = testSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.errors },
          { status: 400 }
        );
      }

      const result = await testPolicy(parsed.data.policyId, {
        userId: parsed.data.userId,
        resourceType: parsed.data.resourceType,
        resourceId: parsed.data.resourceId,
        action: parsed.data.action,
        context: parsed.data.context,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    } else if (action === "deploy") {
      const policyId = body.policyId;
      if (!policyId) {
        return NextResponse.json(
          { error: "policyId is required" },
          { status: 400 }
        );
      }

      const result = await deployPolicy(policyId, session.user.id);
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: "Unknown action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Policy operation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to perform operation" },
      { status: 500 }
    );
  }
}

