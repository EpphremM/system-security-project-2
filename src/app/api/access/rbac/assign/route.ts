import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { assignRole } from "@/lib/access/rbac";

const assignSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  isTemporary: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  reason: z.string().optional(),
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
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { userId, roleId, isTemporary, expiresAt, reason } = parsed.data;

    const assignment = await assignRole(
      userId,
      roleId,
      session.user.id,
      isTemporary ?? false,
      expiresAt ? new Date(expiresAt) : undefined,
      reason
    );

    return NextResponse.json({
      success: true,
      assignment,
      message: "Role assigned successfully",
    });
  } catch (error) {
    console.error("Assign role error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign role" },
      { status: 500 }
    );
  }
}



