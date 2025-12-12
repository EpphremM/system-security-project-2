import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserLifecycleStats,
  bulkUserOperation,
  getAccessReviewData,
  getComplianceReport,
} from "@/lib/dashboard/user-management";
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
    const view = searchParams.get("view");

    if (view === "lifecycle") {
      const data = await getUserLifecycleStats();
      return NextResponse.json(data);
    } else if (view === "access-review") {
      const userId = searchParams.get("userId");
      const department = searchParams.get("department");
      const roleId = searchParams.get("roleId");
      const lastReviewBefore = searchParams.get("lastReviewBefore");

      const data = await getAccessReviewData({
        userId: userId || undefined,
        department: department || undefined,
        roleId: roleId || undefined,
        lastReviewBefore: lastReviewBefore ? new Date(lastReviewBefore) : undefined,
      });
      return NextResponse.json(data);
    } else if (view === "compliance") {
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const complianceType = searchParams.get("complianceType");

      const data = await getComplianceReport({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        complianceType: complianceType || undefined,
      });
      return NextResponse.json(data);
    } else {
      const data = await getUserLifecycleStats();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Get user management data error:", error);
    return NextResponse.json(
      { error: "Failed to get user management data" },
      { status: 500 }
    );
  }
}

const bulkOperationSchema = z.object({
  userIds: z.array(z.string().uuid()),
  operation: z.enum(["LOCK", "UNLOCK", "DEACTIVATE", "ACTIVATE", "DELETE", "RESET_PASSWORD"]),
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
    const parsed = bulkOperationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const result = await bulkUserOperation(
      parsed.data.userIds,
      parsed.data.operation,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Bulk user operation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}

