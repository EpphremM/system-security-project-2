import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revokeRole } from "@/lib/access/rbac";

const revokeSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
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
    const parsed = revokeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { userId, roleId, reason } = parsed.data;

    const assignment = await revokeRole(userId, roleId, session.user.id, reason);

    return NextResponse.json({
      success: true,
      assignment,
      message: "Role revoked successfully",
    });
  } catch (error) {
    console.error("Revoke role error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke role" },
      { status: 500 }
    );
  }
}



