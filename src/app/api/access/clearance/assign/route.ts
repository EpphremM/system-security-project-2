import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { assignClearance } from "@/lib/access/clearance";
import { SecurityLevel } from "@/generated/prisma/enums";

const assignSchema = z.object({
  userId: z.string().uuid(),
  level: z.nativeEnum(SecurityLevel),
  compartments: z.array(z.string()).min(0),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
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
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { userId, level, compartments, reason, expiresAt } = parsed.data;

    const clearance = await assignClearance(
      userId,
      level,
      compartments,
      session.user.id,
      reason,
      expiresAt ? new Date(expiresAt) : undefined
    );

    return NextResponse.json({
      success: true,
      clearance,
      message: "Clearance assigned successfully",
    });
  } catch (error) {
    console.error("Clearance assignment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign clearance" },
      { status: 500 }
    );
  }
}



