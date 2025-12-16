import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { aggregateLogs, getLogStatistics } from "@/lib/logging/aggregation";
import { z } from "zod";

const aggregationSchema = z.object({
  category: z.enum(["SECURITY", "USER_ACTIVITY", "SYSTEM", "COMPLIANCE"]).optional(),
  timeWindow: z.number().int().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
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
    const parsed = aggregationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { category, timeWindow, startDate, endDate } = parsed.data;

    if (startDate && endDate) {
      
      const stats = await getLogStatistics(
        new Date(startDate),
        new Date(endDate),
        category
      );
      return NextResponse.json(stats);
    } else {
      
      const aggregation = await aggregateLogs(category, timeWindow);
      return NextResponse.json(aggregation);
    }
  } catch (error) {
    console.error("Aggregation error:", error);
    return NextResponse.json(
      { error: "Failed to aggregate logs" },
      { status: 500 }
    );
  }
}



