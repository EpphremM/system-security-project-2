import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { reviewClearance } from "@/lib/access/clearance";
import { SecurityLevel } from "@/generated/prisma/enums";

const reviewSchema = z.object({
  userId: z.string().uuid(),
  approved: z.boolean(),
  newLevel: z.nativeEnum(SecurityLevel).optional(),
  newCompartments: z.array(z.string()).optional(),
  notes: z.string().optional(),
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
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { userId, approved, newLevel, newCompartments, notes } = parsed.data;

    await reviewClearance(
      userId,
      session.user.id,
      approved,
      newLevel,
      newCompartments,
      notes
    );

    return NextResponse.json({
      success: true,
      message: "Clearance review completed successfully",
    });
  } catch (error) {
    console.error("Clearance review error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to review clearance" },
      { status: 500 }
    );
  }
}

/**
 * Get users requiring clearance review
 */
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
    const daysBeforeDue = parseInt(searchParams.get("daysBeforeDue") || "30");

    const { getUsersRequiringReview } = await import("@/lib/access/clearance");
    const users = await getUsersRequiringReview(daysBeforeDue);

    return NextResponse.json({
      users,
      count: users.length,
    });
  } catch (error) {
    console.error("Get users requiring review error:", error);
    return NextResponse.json(
      { error: "Failed to get users requiring review" },
      { status: 500 }
    );
  }
}



