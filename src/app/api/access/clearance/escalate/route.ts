import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { requestEscalation } from "@/lib/access/clearance";
import { SecurityLevel } from "@/generated/prisma/enums";

const escalateSchema = z.object({
  targetLevel: z.nativeEnum(SecurityLevel),
  targetCompartments: z.array(z.string()),
  reason: z.string().min(1),
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
    const parsed = escalateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { targetLevel, targetCompartments, reason } = parsed.data;

    const clearance = await requestEscalation(
      session.user.id,
      targetLevel,
      targetCompartments,
      reason
    );

    return NextResponse.json({
      success: true,
      clearance,
      message: "Escalation request submitted successfully",
    });
  } catch (error) {
    console.error("Clearance escalation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to request escalation" },
      { status: 500 }
    );
  }
}



