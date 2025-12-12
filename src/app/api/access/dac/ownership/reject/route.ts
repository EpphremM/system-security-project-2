import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { rejectOwnershipTransfer } from "@/lib/access/dac";

const rejectSchema = z.object({
  transferId: z.string().uuid(),
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
    const parsed = rejectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { transferId, reason } = parsed.data;

    const transfer = await rejectOwnershipTransfer(transferId, session.user.id, reason);

    return NextResponse.json({
      success: true,
      transfer,
      message: "Ownership transfer rejected",
    });
  } catch (error) {
    console.error("Reject ownership transfer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reject ownership transfer" },
      { status: 500 }
    );
  }
}



