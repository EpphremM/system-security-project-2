import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HolidayType } from "@/generated/prisma/enums";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  type: z.nativeEnum(HolidayType),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.any().optional(),
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

    const { name, description, startDate, endDate, type, isRecurring, recurrencePattern } =
      parsed.data;

    const holiday = await prisma.holidaySchedule.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type,
        isRecurring: isRecurring ?? false,
        recurrencePattern,
      },
    });

    return NextResponse.json({
      success: true,
      holiday,
      message: "Holiday schedule created successfully",
    });
  } catch (error) {
    console.error("Create holiday error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create holiday" },
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (startDate && endDate) {
      where.OR = [
        {
          startDate: { lte: new Date(endDate) },
          endDate: { gte: new Date(startDate) },
        },
      ];
    }

    const holidays = await prisma.holidaySchedule.findMany({
      where,
      orderBy: {
        startDate: "asc",
      },
    });

    return NextResponse.json({
      holidays,
      count: holidays.length,
    });
  } catch (error) {
    console.error("Get holidays error:", error);
    return NextResponse.json(
      { error: "Failed to get holidays" },
      { status: 500 }
    );
  }
}



