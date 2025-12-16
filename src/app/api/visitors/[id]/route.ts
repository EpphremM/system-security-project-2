import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/access/unified-access-control";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    
    const visitor = await prisma.visitor.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        hostId: true,
        securityLabel: true,
      },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: "Visitor not found" },
        { status: 404 }
      );
    }

    
    const isHost = visitor.hostId === session.user.id;

    
    if (!isHost) {
      const accessCheck = await checkAccess(request, {
        resourceType: "visitor",
        resourceId: params.id,
        action: "read",
        routePath: "/dashboard/visitors",
        requiredPermission: "view_all_visits", 
        checkRBAC: true,
        checkMAC: true,  
        checkDAC: true,  
        checkRuBAC: false, 
        checkABAC: false, 
      });

      if (!accessCheck.allowed) {
        
        
        return accessCheck.response || NextResponse.json(
          { error: "Access Denied", message: "You don't have permission to view this visitor" },
          { status: 403 }
        );
      }
    }

    
    const fullVisitor = await prisma.visitor.findUnique({
      where: { id: params.id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        visitorLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        approvalRequests: {
          orderBy: { requestedAt: "desc" },
          take: 5,
          include: {
            host: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!fullVisitor) {
      return NextResponse.json(
        { error: "Visitor not found" },
        { status: 404 }
      );
    }

    
    return NextResponse.json({
      visitor: {
        id: fullVisitor.id,
        firstName: fullVisitor.firstName,
        lastName: fullVisitor.lastName,
        email: fullVisitor.email,
        phone: fullVisitor.phone,
        company: fullVisitor.company,
        purpose: fullVisitor.purpose,
        securityLabel: fullVisitor.securityLabel,
        dataCategory: fullVisitor.dataCategory,
        scheduledDate: fullVisitor.scheduledDate.toISOString(),
        scheduledStart: fullVisitor.scheduledStart.toISOString(),
        scheduledEnd: fullVisitor.scheduledEnd.toISOString(),
        actualCheckIn: fullVisitor.actualCheckIn?.toISOString(),
        actualCheckOut: fullVisitor.actualCheckOut?.toISOString(),
        status: fullVisitor.status,
        qrCode: fullVisitor.qrCode,
        badgeNumber: fullVisitor.badgeNumber,
        host: fullVisitor.host,
        approvedBy: fullVisitor.approvedBy,
        approvalDate: fullVisitor.approvalDate?.toISOString(),
        logs: fullVisitor.visitorLogs,
        approvalRequests: fullVisitor.approvalRequests,
        createdAt: fullVisitor.createdAt.toISOString(),
        updatedAt: fullVisitor.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get visitor error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visitor" },
      { status: 500 }
    );
  }
}

