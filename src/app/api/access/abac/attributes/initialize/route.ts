import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { initializeDefaultAttributes } from "@/lib/access/abac";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await initializeDefaultAttributes();

    return NextResponse.json({
      success: true,
      message: "Default attributes initialized successfully",
    });
  } catch (error) {
    console.error("Initialize attributes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initialize attributes" },
      { status: 500 }
    );
  }
}



