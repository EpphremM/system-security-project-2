import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    
    
    return NextResponse.json({
      success: true,
      message: "Session refreshed",
    });
  } catch (error) {
    console.error("Session refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh session" },
      { status: 500 }
    );
  }
}



