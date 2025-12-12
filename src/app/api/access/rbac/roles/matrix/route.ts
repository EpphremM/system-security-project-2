import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRolePermissionMatrix } from "@/lib/access/rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const matrix = await getRolePermissionMatrix();

    return NextResponse.json({
      matrix,
    });
  } catch (error) {
    console.error("Get role matrix error:", error);
    return NextResponse.json(
      { error: "Failed to get role permission matrix" },
      { status: 500 }
    );
  }
}



