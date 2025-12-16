import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { initializePredefinedRoles } from "@/lib/access/rbac";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    
    await initializePredefinedRoles();

    return NextResponse.json({
      success: true,
      message: "Predefined roles initialized successfully",
    });
  } catch (error) {
    console.error("Initialize roles error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initialize roles" },
      { status: 500 }
    );
  }
}



