import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeScheduledReport } from "@/lib/alerting/reports";
import { z } from "zod";

const scheduleSchema = z.object({
  reportType: z.enum([
    "DAILY_SECURITY_SUMMARY",
    "WEEKLY_COMPLIANCE",
    "MONTHLY_AUDIT_REVIEW",
    "QUARTERLY_RISK_ASSESSMENT",
  ]),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]),
  recipients: z.array(z.string().email()),
  format: z.enum(["PDF", "CSV", "JSON"]).optional(),
  filters: z.any().optional(),
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
    const parsed = scheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { reportType, frequency, recipients, format, filters } = parsed.data;

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(frequency);

    const report = await prisma.scheduledReport.create({
      data: {
        reportType,
        frequency,
        recipients,
        format: format || "PDF",
        filters,
        nextRunAt,
        enabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      report,
      message: "Report scheduled successfully",
    });
  } catch (error) {
    console.error("Schedule report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to schedule report" },
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

    const reports = await prisma.scheduledReport.findMany({
      where: { enabled: true },
      orderBy: { nextRunAt: "asc" },
    });

    return NextResponse.json({
      reports,
    });
  } catch (error) {
    console.error("Get scheduled reports error:", error);
    return NextResponse.json(
      { error: "Failed to get scheduled reports" },
      { status: 500 }
    );
  }
}

function calculateNextRunTime(frequency: string): Date {
  const next = new Date();

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      next.setHours(0, 0, 0, 0);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
      break;
  }

  return next;
}

