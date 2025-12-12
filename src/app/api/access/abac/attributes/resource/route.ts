import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { setResourceAttribute, getResourceAttributes } from "@/lib/access/abac";

const setSchema = z.object({
  resourceType: z.string(),
  resourceId: z.string(),
  attributeName: z.string(),
  value: z.string(),
  source: z.string().optional(),
  calculated: z.boolean().optional(),
});

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
    const parsed = setSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { resourceType, resourceId, attributeName, value, source, calculated } = parsed.data;

    const attribute = await setResourceAttribute(
      resourceType,
      resourceId,
      attributeName,
      value,
      source,
      calculated
    );

    return NextResponse.json({
      success: true,
      attribute,
      message: "Resource attribute set successfully",
    });
  } catch (error) {
    console.error("Set resource attribute error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set resource attribute" },
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

    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get("resourceType");
    const resourceId = searchParams.get("resourceId");

    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { error: "resourceType and resourceId are required" },
        { status: 400 }
      );
    }

    const attributes = await getResourceAttributes(resourceType, resourceId);

    return NextResponse.json({
      attributes,
    });
  } catch (error) {
    console.error("Get resource attributes error:", error);
    return NextResponse.json(
      { error: "Failed to get resource attributes" },
      { status: 500 }
    );
  }
}



