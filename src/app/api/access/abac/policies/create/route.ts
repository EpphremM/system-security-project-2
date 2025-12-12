import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  resource: z.string(),
  action: z.string(),
  attributes: z.any(), // Attribute conditions
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
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

    const { name, description, resource, action, attributes, priority, enabled } = parsed.data;

    const policy = await prisma.accessPolicy.create({
      data: {
        name,
        description,
        resource,
        action,
        policyType: "ABAC",
        attributes,
        priority: priority ?? 0,
        enabled: enabled ?? true,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "abac.policy_created",
        resource: "policy",
        resourceId: policy.id,
        securityLabel: "INTERNAL",
        details: {
          name,
          resource,
          action,
        },
      },
    });

    return NextResponse.json({
      success: true,
      policy,
      message: "ABAC policy created successfully",
    });
  } catch (error) {
    console.error("Create ABAC policy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create policy" },
      { status: 500 }
    );
  }
}



