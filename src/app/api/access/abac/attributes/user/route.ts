import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { setUserAttribute, getUserAttributes } from "@/lib/access/abac";

const setSchema = z.object({
  attributeName: z.string(),
  value: z.string(),
  source: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
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
    const parsed = setSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { attributeName, value, source, expiresAt } = parsed.data;

    const attribute = await setUserAttribute(
      session.user.id,
      attributeName,
      value,
      source,
      expiresAt ? new Date(expiresAt) : undefined
    );

    return NextResponse.json({
      success: true,
      attribute,
      message: "User attribute set successfully",
    });
  } catch (error) {
    console.error("Set user attribute error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set user attribute" },
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
    const userId = searchParams.get("userId") || session.user.id;

    const attributes = await getUserAttributes(userId);

    return NextResponse.json({
      attributes,
    });
  } catch (error) {
    console.error("Get user attributes error:", error);
    return NextResponse.json(
      { error: "Failed to get user attributes" },
      { status: 500 }
    );
  }
}



