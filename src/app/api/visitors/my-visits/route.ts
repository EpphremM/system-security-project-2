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

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { legacyRole: true },
    });

    const userRole = currentUser?.legacyRole || (session.user.role as string) || "USER";
    const isSuperAdmin = userRole === "SUPER_ADMIN";
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "HR" || userRole === "IT_ADMIN";
    const isReceptionist = userRole === "RECEPTIONIST";
    const isSecurity = userRole === "SECURITY";

    const whereClause: any = {};
    
    if (!isSuperAdmin && !isAdmin && !isReceptionist && !isSecurity) {
      whereClause.hostId = session.user.id;
    }

    const visits = await prisma.visitor.findMany({
      where: whereClause,
      orderBy: {
        scheduledDate: "desc",
      },
      take: (isSuperAdmin || isAdmin) ? 1000 : 50,
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
        hostId: true,
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    
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
      hostId: visit.hostId,
      host: visit.host,
      canEdit: isSuperAdmin || isAdmin || isReceptionist || visit.hostId === session.user.id,
    }));

    return NextResponse.json({
      recentVisits: formattedVisits, 
      visits: formattedVisits, 
    });
  } catch (error) {
    console.error("Get my visits error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visits" },
      { status: 500 }
    );
  }
}



