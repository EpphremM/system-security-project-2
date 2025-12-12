import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { grantAreaAccess, revokeAreaAccess, checkAreaAccess } from "@/lib/visitors/access-control";
import { z } from "zod";

const grantSchema = z.object({
  visitorId: z.string().uuid(),
  areaId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
  requiresEscort: z.boolean().optional(),
  escortId: z.string().uuid().optional(),
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
    const parsed = grantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { visitorId, areaId, expiresAt, requiresEscort, escortId } = parsed.data;

    const accessId = await grantAreaAccess(visitorId, areaId, {
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      requiresEscort,
      escortId,
    });

    return NextResponse.json({
      success: true,
      accessId,
      message: "Area access granted successfully",
    });
  } catch (error) {
    console.error("Grant area access error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to grant area access" },
      { status: 500 }
    );
  }
}

const revokeSchema = z.object({
  accessId: z.string().uuid(),
  reason: z.string().optional(),
});

export async function DELETE(request: NextRequest) {
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

    await revokeAreaAccess(parsed.data.accessId, session.user.id, parsed.data.reason);

    return NextResponse.json({
      success: true,
      message: "Area access revoked successfully",
    });
  } catch (error) {
    console.error("Revoke area access error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke area access" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const visitorId = searchParams.get("visitorId");
    const areaId = searchParams.get("areaId");

    if (!visitorId || !areaId) {
      return NextResponse.json(
        { error: "visitorId and areaId are required" },
        { status: 400 }
      );
    }

    const result = await checkAreaAccess(visitorId, areaId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Check area access error:", error);
    return NextResponse.json(
      { error: "Failed to check area access" },
      { status: 500 }
    );
  }
}



