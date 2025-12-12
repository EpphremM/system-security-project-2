import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateDashboardAlerts } from "@/lib/alerting/dashboard";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await generateDashboardAlerts();

    return NextResponse.json({
      success: true,
      alerts: result.alerts,
      count: result.count,
    });
  } catch (error) {
    console.error("Generate dashboard alerts error:", error);
    return NextResponse.json(
      { error: "Failed to generate dashboard alerts" },
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

    const { getActiveDashboardAlerts } = await import("@/lib/alerting/dashboard");
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const alerts = await getActiveDashboardAlerts(limit);

    return NextResponse.json({
      alerts,
    });
  } catch (error) {
    console.error("Get dashboard alerts error:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard alerts" },
      { status: 500 }
    );
  }
}



