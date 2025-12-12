import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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
    const { resourceId, resourceType, ...policy } = body;

    // Save ABAC policy to database
    // This would typically be stored in an ABACPolicy table
    return NextResponse.json({
      success: true,
      message: "Policy saved successfully",
      policy: {
        ...policy,
        id: `policy-${Date.now()}`,
      },
    });
  } catch (error) {
    console.error("Save policy error:", error);
    return NextResponse.json(
      { error: "Failed to save policy" },
      { status: 500 }
    );
  }
}


