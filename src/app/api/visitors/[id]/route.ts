import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/access/unified-access-control";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    const visitor = await prisma.visitor.findUnique({
      where: { id },
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

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { legacyRole: true },
    });

    const userRole = currentUser?.legacyRole || (session.user.role as string) || "USER";
    const isSuperAdmin = userRole === "SUPER_ADMIN";
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "HR" || userRole === "IT_ADMIN";
    const isReceptionist = userRole === "RECEPTIONIST";
    
    const isHost = visitor.hostId === session.user.id;

    if (!isHost && !isSuperAdmin && !isAdmin && !isReceptionist) {
      const accessCheck = await checkAccess(request, {
        resourceType: "visitor",
        resourceId: id,
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
      where: { id },
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const visitor = await prisma.visitor.findUnique({
      where: { id },
      select: {
        id: true,
        hostId: true,
      },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: "Visitor not found" },
        { status: 404 }
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
    const isHost = visitor.hostId === session.user.id;

    if (!isHost && !isSuperAdmin && !isAdmin && !isReceptionist) {
      return NextResponse.json(
        { error: "Access Denied", message: "You don't have permission to edit this visitor" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { visitorUpdateSchema } = await import("@/lib/utils/validation");
    
    const preprocessedBody: any = {
      ...body,
      id,
    };
    
    if (body.scheduledDate) {
      const date = new Date(body.scheduledDate);
      if (!isNaN(date.getTime())) {
        preprocessedBody.scheduledDate = date;
      }
    }
    
    if (body.scheduledStart) {
      const date = new Date(body.scheduledStart);
      if (!isNaN(date.getTime())) {
        preprocessedBody.scheduledStart = date;
      }
    }
    
    if (body.scheduledEnd) {
      const date = new Date(body.scheduledEnd);
      if (!isNaN(date.getTime())) {
        preprocessedBody.scheduledEnd = date;
      }
    }
    
    if (body.email !== undefined) {
      preprocessedBody.email = body.email === "" ? undefined : body.email;
    }
    
    const parsed = visitorUpdateSchema.safeParse(preprocessedBody);

    if (!parsed.success) {
      const issues = parsed.error.issues || [];
      console.error("Validation errors:", issues);
      const errorMessage = issues.length > 0
        ? issues.map(e => `${e.path.join('.') || 'field'}: ${e.message}`).join(', ')
        : "Invalid input";
      
      return NextResponse.json(
        { 
          error: "Invalid input", 
          details: issues,
          message: errorMessage
        },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName;
    if (parsed.data.lastName !== undefined) updateData.lastName = parsed.data.lastName;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
    if (parsed.data.company !== undefined) updateData.company = parsed.data.company;
    if (parsed.data.purpose !== undefined) updateData.purpose = parsed.data.purpose;
    if (parsed.data.scheduledDate !== undefined) updateData.scheduledDate = new Date(parsed.data.scheduledDate);
    if (parsed.data.scheduledStart !== undefined) updateData.scheduledStart = new Date(parsed.data.scheduledStart);
    if (parsed.data.scheduledEnd !== undefined) updateData.scheduledEnd = new Date(parsed.data.scheduledEnd);
    if (parsed.data.securityLabel !== undefined) updateData.securityLabel = parsed.data.securityLabel;

    const updatedVisitor = await prisma.visitor.update({
      where: { id },
      data: updateData,
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
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        category: "USER_ACTIVITY",
        logType: "DATA_UPDATE",
        action: "visitor.updated",
        resource: "visitor",
        resourceId: id,
        details: {
          updatedFields: Object.keys(updateData),
          updatedBy: session.user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      visitor: updatedVisitor,
    });
  } catch (error) {
    console.error("Update visitor error:", error);
    return NextResponse.json(
      { error: "Failed to update visitor" },
      { status: 500 }
    );
  }
}

