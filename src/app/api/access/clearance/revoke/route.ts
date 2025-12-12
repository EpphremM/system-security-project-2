import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revokeClearance } from "@/lib/access/clearance";

const revokeSchema = z.object({
  userId: z.string().uuid(),
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

    const { userId, reason } = parsed.data;

    const clearance = await revokeClearance(userId, session.user.id, reason);

    return NextResponse.json({
      success: true,
      clearance,
      message: "Clearance revoked successfully",
    });
  } catch (error) {
    console.error("Clearance revocation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke clearance" },
      { status: 500 }
    );
  }
}



