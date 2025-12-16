import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listReports, getReport } from "@/lib/reports/generator";
import { ReportType } from "@/generated/prisma/enums";

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

    if (reportId) {
      
      const report = await getReport(reportId);
      return NextResponse.json(report);
    }

    
    const reportType = searchParams.get("reportType") as ReportType | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const generatedBy = searchParams.get("generatedBy");
    const limit = searchParams.get("limit");

    const reports = await listReports({
      reportType: reportType || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      generatedBy: generatedBy || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("List reports error:", error);
    return NextResponse.json(
      { error: "Failed to list reports" },
      { status: 500 }
    );
  }
}

