import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { rejectRoleRequest } from "@/lib/access/rbac";

const rejectSchema = z.object({
  requestId: z.string().uuid(),
  rejectionReason: z.string().optional(),
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
    const parsed = rejectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { requestId, rejectionReason } = parsed.data;

    const request = await rejectRoleRequest(requestId, session.user.id, rejectionReason);

    return NextResponse.json({
      success: true,
      request,
      message: "Role request rejected",
    });
  } catch (error) {
    console.error("Reject role request error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reject role request" },
      { status: 500 }
    );
  }
}



