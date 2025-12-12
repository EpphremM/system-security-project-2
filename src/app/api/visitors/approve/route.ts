import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { approveVisitor, rejectVisitor, escalateApprovalRequest, bulkApproveGroupVisit } from "@/lib/visitors/registration";
import { z } from "zod";

const approveSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["APPROVE", "REJECT", "ESCALATE"]),
  checkSecurityClearance: z.boolean().optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
  departmentHeadId: z.string().uuid().optional(),
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
    const parsed = approveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { requestId, action, checkSecurityClearance, notes, reason, departmentHeadId } = parsed.data;

    switch (action) {
      case "APPROVE":
        const result = await approveVisitor(requestId, session.user.id, {
          checkSecurityClearance,
          notes,
        });
        return NextResponse.json({
          success: true,
          ...result,
        });

      case "REJECT":
        if (!reason) {
          return NextResponse.json(
            { error: "Reason is required for rejection" },
            { status: 400 }
          );
        }
        await rejectVisitor(requestId, session.user.id, reason);
        return NextResponse.json({
          success: true,
          message: "Visitor rejected successfully",
        });

      case "ESCALATE":
        if (!departmentHeadId) {
          return NextResponse.json(
            { error: "Department head ID is required for escalation" },
            { status: 400 }
          );
        }
        await escalateApprovalRequest(requestId, departmentHeadId, reason);
        return NextResponse.json({
          success: true,
          message: "Request escalated successfully",
        });

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Approve visitor error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process approval" },
      { status: 500 }
    );
  }
}

const bulkApproveSchema = z.object({
  groupId: z.string(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = bulkApproveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const result = await bulkApproveGroupVisit(parsed.data.groupId, session.user.id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Bulk approve error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to bulk approve" },
      { status: 500 }
    );
  }
}



