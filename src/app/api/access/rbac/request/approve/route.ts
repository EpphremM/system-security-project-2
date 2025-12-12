import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { approveRoleRequest } from "@/lib/access/rbac";

const approveSchema = z.object({
  requestId: z.string().uuid(),
  isTemporary: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
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

    const { requestId, isTemporary, expiresAt } = parsed.data;

    const assignment = await approveRoleRequest(
      requestId,
      session.user.id,
      isTemporary,
      expiresAt ? new Date(expiresAt) : undefined
    );

    return NextResponse.json({
      success: true,
      assignment,
      message: "Role request approved successfully",
    });
  } catch (error) {
    console.error("Approve role request error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve role request" },
      { status: 500 }
    );
  }
}



