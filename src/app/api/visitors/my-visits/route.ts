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

    // Get visits where the current user is the host
    const visits = await prisma.visitor.findMany({
      where: {
        hostId: session.user.id,
      },
      orderBy: {
        scheduledDate: "desc",
      },
      take: 50,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        purpose: true,
        securityLabel: true,
        scheduledDate: true,
        scheduledStart: true,
        scheduledEnd: true,
        status: true,
        actualCheckIn: true,
        actualCheckOut: true,
      },
    });

    // Format the visits to match frontend expectations
    const formattedVisits = visits.map((visit) => ({
      id: visit.id,
      firstName: visit.firstName,
      lastName: visit.lastName,
      email: visit.email,
      phone: visit.phone,
      company: visit.company,
      purpose: visit.purpose,
      securityLabel: visit.securityLabel,
      scheduledDate: visit.scheduledDate.toISOString(),
      scheduledStart: visit.scheduledStart.toISOString(),
      scheduledEnd: visit.scheduledEnd.toISOString(),
      status: visit.status,
      checkInTime: visit.actualCheckIn?.toISOString(),
      checkOutTime: visit.actualCheckOut?.toISOString(),
    }));

    return NextResponse.json({
      recentVisits: formattedVisits, // Frontend expects 'recentVisits'
      visits: formattedVisits, // Also include 'visits' for compatibility
    });
  } catch (error) {
    console.error("Get my visits error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visits" },
      { status: 500 }
    );
  }
}



