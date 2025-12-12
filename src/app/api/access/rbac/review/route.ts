import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { reviewRole } from "@/lib/access/rbac";

const reviewSchema = z.object({
  roleId: z.string().uuid(),
  approved: z.boolean(),
  assignmentId: z.string().uuid().optional(),
  notes: z.string().optional(),
  recommendations: z.string().optional(),
  reviewType: z.enum(["ANNUAL", "AD_HOC", "DEPROVISIONING", "ESCALATION"]).optional(),
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

    const { roleId, approved, assignmentId, notes, recommendations, reviewType } = parsed.data;

    const review = await reviewRole(
      roleId,
      session.user.id,
      approved,
      assignmentId,
      notes,
      recommendations,
      reviewType ?? "ANNUAL"
    );

    return NextResponse.json({
      success: true,
      review,
      message: "Role review completed successfully",
    });
  } catch (error) {
    console.error("Review role error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to review role" },
      { status: 500 }
    );
  }
}

/**
 * Get roles requiring review
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

    const { getRolesRequiringReview } = await import("@/lib/access/rbac");
    const roles = await getRolesRequiringReview(daysBeforeDue);

    return NextResponse.json({
      roles,
      count: roles.length,
    });
  } catch (error) {
    console.error("Get roles requiring review error:", error);
    return NextResponse.json(
      { error: "Failed to get roles requiring review" },
      { status: 500 }
    );
  }
}



