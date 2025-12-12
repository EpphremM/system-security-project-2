import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getResourcePermissions } from "@/lib/access/dac";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get("resourceType");
    const resourceId = searchParams.get("resourceId");

    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { error: "resourceType and resourceId are required" },
        { status: 400 }
      );
    }

    const permissions = await getResourcePermissions(resourceType, resourceId);

    if (!permissions) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      resource: permissions,
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    return NextResponse.json(
      { error: "Failed to get permissions" },
      { status: 500 }
    );
  }
}



