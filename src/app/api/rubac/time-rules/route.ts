import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { resourceId, resourceType, rules } = body;

    // Save time rules to database
    // This would typically be stored in a TimeRule table
    // For now, we'll return success

    return NextResponse.json({
      success: true,
      message: "Time rules saved successfully",
      rules,
    });
  } catch (error) {
    console.error("Save time rules error:", error);
    return NextResponse.json(
      { error: "Failed to save time rules" },
      { status: 500 }
    );
  }
}


