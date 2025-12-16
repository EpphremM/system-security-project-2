import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { RuleType } from "@/generated/prisma/enums";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ruleType: z.nativeEnum(RuleType),
  config: z.any(), 
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  emergencyOverride: z.boolean().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
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
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      ruleType,
      config,
      enabled,
      priority,
      emergencyOverride,
      validFrom,
      validUntil,
    } = parsed.data;

    const rule = await prisma.accessRule.create({
      data: {
        name,
        description,
        ruleType,
        config,
        enabled: enabled ?? true,
        priority: priority ?? 0,
        emergencyOverride: emergencyOverride ?? false,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });

    
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "rubac.rule_created",
        resource: "rule",
        resourceId: rule.id,
        securityLabel: "INTERNAL",
        details: {
          ruleType,
          name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      rule,
      message: "Access rule created successfully",
    });
  } catch (error) {
    console.error("Create rule error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create rule" },
      { status: 500 }
    );
  }
}



