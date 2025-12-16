import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";

    return NextResponse.json({
      ip,
      location: "Unknown", 
    });
  } catch (error) {
    console.error("Check location error:", error);
    return NextResponse.json(
      { error: "Failed to check location" },
      { status: 500 }
    );
  }
}


