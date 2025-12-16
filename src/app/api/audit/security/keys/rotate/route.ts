import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rotateKeys } from "@/lib/logging/encryption";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    
    const result = await rotateKeys();

    return NextResponse.json({
      success: true,
      message: `Rotated ${result.rotated} key categories`,
      rotated: result.rotated,
      keys: result.keys,
    });
  } catch (error) {
    console.error("Rotate keys error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to rotate keys" },
      { status: 500 }
    );
  }
}



