import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revokeSharingLink } from "@/lib/access/sharing";

const revokeSchema = z.object({
  linkId: z.string().uuid(),
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

    const { linkId } = parsed.data;

    await revokeSharingLink(linkId, session.user.id);

    return NextResponse.json({
      success: true,
      message: "Sharing link revoked successfully",
    });
  } catch (error) {
    console.error("Revoke sharing link error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke sharing link" },
      { status: 500 }
    );
  }
}



