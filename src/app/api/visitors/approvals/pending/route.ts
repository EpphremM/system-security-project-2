import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/access/unified-access-control";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    
    const accessCheck = await checkAccess(request, {
      resourceType: "visitor_approval",
      action: "read",
      routePath: "/dashboard/visitors/approvals",
      requiredPermission: "approve_visitor",
      checkRBAC: true,
      checkMAC: false,
      checkDAC: false,
      checkRuBAC: false,
      checkABAC: false,
    });

    if (!accessCheck.allowed) {
      return accessCheck.response || NextResponse.json(
        { error: "Access Denied" },
        { status: 403 }
      );
    }

    
    const approvals = await prisma.visitorApprovalRequest.findMany({
      where: {
        status: {
          in: ["PENDING", "ESCALATED"],
        },
      },
      include: {
        visitor: {
          include: {
            host: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
              },
            },
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
      take: 100,
    });

    
    const formattedApprovals = approvals.map((approval) => ({
      id: approval.id,
      visitorId: approval.visitorId,
      visitor: {
        id: approval.visitor.id,
        firstName: approval.visitor.firstName,
        lastName: approval.visitor.lastName,
        email: approval.visitor.email,
        phone: approval.visitor.phone,
        company: approval.visitor.company,
        purpose: approval.visitor.purpose,
        securityLabel: approval.visitor.securityLabel,
        scheduledDate: approval.visitor.scheduledDate.toISOString(),
        scheduledStart: approval.visitor.scheduledStart.toISOString(),
        scheduledEnd: approval.visitor.scheduledEnd.toISOString(),
        host: approval.visitor.host,
      },
      host: approval.host,
      status: approval.status,
      requestedAt: approval.requestedAt.toISOString(),
      requiresSecurityClearance: approval.requiresSecurityClearance,
      securityClearanceChecked: approval.securityClearanceChecked,
      escalationReason: approval.escalationReason,
      escalatedAt: approval.escalatedAt?.toISOString(),
    }));

    return NextResponse.json({
      approvals: formattedApprovals,
      count: formattedApprovals.length,
    });
  } catch (error) {
    console.error("Get pending approvals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending approvals" },
      { status: 500 }
    );
  }
}

