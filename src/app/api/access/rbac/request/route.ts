import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { requestRole } from "@/lib/access/rbac";

const requestSchema = z.object({
  roleId: z.string().uuid(),
  reason: z.string().optional(),
  justification: z.string().optional(),
  isTemporary: z.boolean().optional(),
  requestedExpiresAt: z.string().datetime().optional(),
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
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { roleId, reason, justification, isTemporary, requestedExpiresAt } = parsed.data;

    const roleRequest = await requestRole(
      session.user.id,
      roleId,
      session.user.id,
      reason,
      justification,
      isTemporary ?? false,
      requestedExpiresAt ? new Date(requestedExpiresAt) : undefined
    );

    return NextResponse.json({
      success: true,
      request: roleRequest,
      message: "Role request submitted successfully",
    });
  } catch (error) {
    console.error("Request role error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to request role" },
      { status: 500 }
    );
  }
}



