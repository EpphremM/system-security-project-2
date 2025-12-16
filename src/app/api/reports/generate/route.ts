import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAndSaveReport, exportReport } from "@/lib/reports/generator";
import { ReportType, ReportFormat } from "@/generated/prisma/enums";
import { z } from "zod";

const generateSchema = z.object({
  reportType: z.nativeEnum(ReportType),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  filters: z.any().optional(),
  format: z.nativeEnum(ReportFormat).optional(),
  templateId: z.string().uuid().optional(),
  scheduleId: z.string().uuid().optional(),
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
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const reportId = await generateAndSaveReport(
      parsed.data.reportType,
      session.user.id,
      {
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        filters: parsed.data.filters,
        format: parsed.data.format,
        templateId: parsed.data.templateId,
        scheduleId: parsed.data.scheduleId,
      }
    );

    return NextResponse.json({
      success: true,
      reportId,
      message: "Report generated successfully",
    });
  } catch (error) {
    console.error("Generate report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
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
    const reportId = searchParams.get("reportId");
    const format = searchParams.get("format") as ReportFormat | null;

    if (reportId && format) {
      
      const exportData = await exportReport(reportId, format);
      return new NextResponse(exportData.content, {
        headers: {
          "Content-Type": exportData.mimeType,
          "Content-Disposition": `attachment; filename="${exportData.filename}"`,
        },
      });
    }

    return NextResponse.json(
      { error: "reportId and format are required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Export report error:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}
