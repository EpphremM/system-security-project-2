import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { grantPermission } from "@/lib/access/dac";

const grantSchema = z.object({
  resourceType: z.string(),
  resourceId: z.string(),
  userId: z.string().uuid(),
  permissions: z.object({
    read: z.boolean().optional(),
    write: z.boolean().optional(),
    execute: z.boolean().optional(),
    delete: z.boolean().optional(),
    share: z.boolean().optional(),
  }),
  expiresAt: z.string().datetime().optional(),
  reason: z.string().optional(),
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
    const parsed = grantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { resourceType, resourceId, userId, permissions, expiresAt, reason } = parsed.data;

    const permission = await grantPermission(
      resourceType,
      resourceId,
      userId,
      permissions,
      session.user.id,
      expiresAt ? new Date(expiresAt) : undefined,
      reason
    );

    return NextResponse.json({
      success: true,
      permission,
      message: "Permission granted successfully",
    });
  } catch (error) {
    console.error("Grant permission error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to grant permission";
    
    if (errorMessage.includes("permission to share")) {
      return NextResponse.json(
        { 
          error: errorMessage,
          details: "You need to be an admin, have TOP_SECRET clearance, or have explicit share permissions to share this resource."
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



