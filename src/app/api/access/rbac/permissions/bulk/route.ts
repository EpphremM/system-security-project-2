import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { bulkAssignPermissions } from "@/lib/access/rbac";

const bulkSchema = z.object({
  roleId: z.string().uuid(),
  permissionIds: z.array(z.string().uuid()),
  granted: z.boolean().optional(),
  conditions: z.any().optional(),
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
    const parsed = bulkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { roleId, permissionIds, granted, conditions } = parsed.data;

    const permissions = await bulkAssignPermissions(
      roleId,
      permissionIds,
      granted ?? true,
      conditions
    );

    return NextResponse.json({
      success: true,
      permissions,
      count: permissions.length,
      message: "Permissions assigned successfully",
    });
  } catch (error) {
    console.error("Bulk assign permissions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign permissions" },
      { status: 500 }
    );
  }
}



