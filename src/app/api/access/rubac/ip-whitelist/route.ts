import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ipRanges: z.array(z.string()), 
  location: z.string().optional(),
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

    const { name, description, ipRanges, location, enabled } = parsed.data;

    const whitelist = await prisma.iPWhitelist.create({
      data: {
        name,
        description,
        ipRanges,
        location,
        enabled: enabled ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      whitelist,
      message: "IP whitelist created successfully",
    });
  } catch (error) {
    console.error("Create IP whitelist error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create IP whitelist" },
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

    const whitelists = await prisma.iPWhitelist.findMany({
      where: {
        enabled: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      whitelists,
      count: whitelists.length,
    });
  } catch (error) {
    console.error("Get IP whitelists error:", error);
    return NextResponse.json(
      { error: "Failed to get IP whitelists" },
      { status: 500 }
    );
  }
}



