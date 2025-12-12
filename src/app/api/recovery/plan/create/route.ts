import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createRecoveryPlan } from "@/lib/recovery/disaster-recovery";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().min(1),
  systemType: z.enum(["CRITICAL", "IMPORTANT", "NON_CRITICAL"]),
  procedures: z.any(),
  description: z.string().optional(),
  rto: z.number().int().optional(),
  rpo: z.number().int().optional(),
  prerequisites: z.any().optional(),
  recoveryTeam: z.any().optional(),
  contactList: z.any().optional(),
  vendorContacts: z.any().optional(),
  regulatoryProcedures: z.any().optional(),
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
    const parsed = planSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const planId = await createRecoveryPlan(
      parsed.data.name,
      parsed.data.systemType,
      parsed.data.procedures,
      {
        description: parsed.data.description,
        rto: parsed.data.rto,
        rpo: parsed.data.rpo,
        prerequisites: parsed.data.prerequisites,
        recoveryTeam: parsed.data.recoveryTeam,
        contactList: parsed.data.contactList,
        vendorContacts: parsed.data.vendorContacts,
        regulatoryProcedures: parsed.data.regulatoryProcedures,
      }
    );

    return NextResponse.json({
      success: true,
      planId,
      message: "Recovery plan created successfully",
    });
  } catch (error) {
    console.error("Create recovery plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create recovery plan" },
      { status: 500 }
    );
  }
}



