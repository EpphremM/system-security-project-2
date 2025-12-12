import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executeRecoveryPlan, testRecoveryPlan } from "@/lib/recovery/disaster-recovery";
import { z } from "zod";

const executeSchema = z.object({
  planId: z.string().uuid(),
  test: z.boolean().optional(),
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
    const parsed = executeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { planId, test } = parsed.data;

    if (test) {
      // Test recovery plan
      const result = await testRecoveryPlan(planId, session.user.id);
      return NextResponse.json({
        success: result.success,
        testResults: result.testResults,
        message: result.success
          ? "Recovery plan test completed successfully"
          : "Recovery plan test failed",
      });
    } else {
      // Execute recovery plan
      const executionId = await executeRecoveryPlan(planId, session.user.id);
      return NextResponse.json({
        success: true,
        executionId,
        message: "Recovery plan execution started",
      });
    }
  } catch (error) {
    console.error("Execute recovery error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute recovery plan" },
      { status: 500 }
    );
  }
}



