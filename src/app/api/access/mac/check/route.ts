import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkReadAccess, checkWriteAccess } from "@/lib/access/mac";
import { SecurityLevel } from "@/generated/prisma/enums";

const checkSchema = z.object({
  resourceType: z.string(),
  resourceId: z.string(),
  action: z.enum(["read", "write"]),
  targetLevel: z.nativeEnum(SecurityLevel).optional(),
  targetCompartments: z.array(z.string()).optional(),
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
    const parsed = checkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { resourceType, resourceId, action, targetLevel, targetCompartments } = parsed.data;

    let result;
    if (action === "read") {
      result = await checkReadAccess(session.user.id, resourceType, resourceId);
    } else {
      result = await checkWriteAccess(
        session.user.id,
        resourceType,
        resourceId,
        targetLevel,
        targetCompartments
      );
    }

    if (!result.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          reason: result.reason,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      allowed: true,
    });
  } catch (error) {
    console.error("MAC check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check access" },
      { status: 500 }
    );
  }
}



