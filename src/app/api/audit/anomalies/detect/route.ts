import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectAnomalies, getRecentAnomalies } from "@/lib/logging/anomaly-detection";
import { z } from "zod";

const detectSchema = z.object({
  timeWindow: z.number().int().optional(),
  limit: z.number().int().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
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
    const parsed = detectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { timeWindow } = parsed.data;

    const result = await detectAnomalies(timeWindow);

    return NextResponse.json({
      success: true,
      anomalies: result.anomalies,
      count: result.count,
    });
  } catch (error) {
    console.error("Detect anomalies error:", error);
    return NextResponse.json(
      { error: "Failed to detect anomalies" },
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const severity = searchParams.get("severity") as any;

    const anomalies = await getRecentAnomalies(limit, severity);

    return NextResponse.json({
      anomalies,
    });
  } catch (error) {
    console.error("Get anomalies error:", error);
    return NextResponse.json(
      { error: "Failed to get anomalies" },
      { status: 500 }
    );
  }
}



