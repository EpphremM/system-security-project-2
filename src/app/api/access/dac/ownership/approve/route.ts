import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { approveOwnershipTransfer } from "@/lib/access/dac";

const approveSchema = z.object({
  transferId: z.string().uuid(),
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

    const { transferId } = parsed.data;

    const transfer = await approveOwnershipTransfer(transferId, session.user.id);

    return NextResponse.json({
      success: true,
      transfer,
      message: "Ownership transfer approved successfully",
    });
  } catch (error) {
    console.error("Approve ownership transfer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve ownership transfer" },
      { status: 500 }
    );
  }
}



