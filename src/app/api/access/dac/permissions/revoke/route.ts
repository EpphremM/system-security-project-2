import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revokePermission } from "@/lib/access/dac";

const revokeSchema = z.object({
  resourceType: z.string(),
  resourceId: z.string(),
  userId: z.string().uuid(),
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

    const { resourceType, resourceId, userId } = parsed.data;

    await revokePermission(resourceType, resourceId, userId, session.user.id);

    return NextResponse.json({
      success: true,
      message: "Permission revoked successfully",
    });
  } catch (error) {
    console.error("Revoke permission error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke permission" },
      { status: 500 }
    );
  }
}



