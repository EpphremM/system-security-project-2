import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deprovisionExpiredRoles } from "@/lib/access/rbac";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const count = await deprovisionExpiredRoles();

    return NextResponse.json({
      success: true,
      count,
      message: `${count} expired role(s) deprovisioned`,
    });
  } catch (error) {
    console.error("Deprovision roles error:", error);
    return NextResponse.json(
      { error: "Failed to deprovision expired roles" },
      { status: 500 }
    );
  }
}

