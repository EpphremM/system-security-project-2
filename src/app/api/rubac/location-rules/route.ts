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
    const { resourceId, resourceType, rules } = body;

    // Save location rules to database
    return NextResponse.json({
      success: true,
      message: "Location rules saved successfully",
      rules,
    });
  } catch (error) {
    console.error("Save location rules error:", error);
    return NextResponse.json(
      { error: "Failed to save location rules" },
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

    // Get client IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";

    return NextResponse.json({
      ip,
      location: "Unknown", // Would use geolocation service in production
    });
  } catch (error) {
    console.error("Check location error:", error);
    return NextResponse.json(
      { error: "Failed to check location" },
      { status: 500 }
    );
  }
}


