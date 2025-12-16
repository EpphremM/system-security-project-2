import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const logType = searchParams.get("logType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (category && category !== "ALL") {
      where.category = category;
    }
    if (logType && logType !== "ALL") {
      where.logType = logType;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 10000, 
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    
    const headers = [
      "Timestamp",
      "User",
      "Action",
      "Resource",
      "Resource ID",
      "Category",
      "Log Type",
      "IP Address",
      "Details",
    ];

    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.user?.email || log.userId || "System",
      log.action,
      log.resource,
      log.resourceId || "",
      log.category,
      log.logType,
      log.ipAddress || "",
      JSON.stringify(log.details || {}),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export audit logs error:", error);
    return NextResponse.json(
      { error: "Failed to export audit logs" },
      { status: 500 }
    );
  }
}
