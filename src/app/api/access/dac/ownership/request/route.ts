import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { requestOwnershipTransfer } from "@/lib/access/dac";

const requestSchema = z.object({
  resourceType: z.string(),
  resourceId: z.string(),
  toUserId: z.string().uuid(),
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
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { resourceType, resourceId, toUserId, reason } = parsed.data;

    const transfer = await requestOwnershipTransfer(
      resourceType,
      resourceId,
      toUserId,
      session.user.id,
      reason
    );

    return NextResponse.json({
      success: true,
      transfer,
      message: "Ownership transfer requested successfully",
    });
  } catch (error) {
    console.error("Request ownership transfer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to request ownership transfer" },
      { status: 500 }
    );
  }
}



