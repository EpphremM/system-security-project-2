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

    const sharedResources = await prisma.resourcePermission.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        resource: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        grantedAt: "desc",
      },
    });

    const sharedVisitors = sharedResources
      .filter((rp) => rp.resource.type === "visitor")
      .map((rp) => ({
        resourceId: rp.resource.resourceId,
        permissions: {
          read: rp.canRead,
          write: rp.canWrite,
          delete: rp.canDelete,
          share: rp.canShare,
          execute: rp.canExecute,
        },
        grantedBy: rp.grantedBy,
        grantedAt: rp.grantedAt,
        expiresAt: rp.expiresAt,
        owner: rp.resource.owner,
      }));

    const visitorIds = sharedVisitors.map((sv) => sv.resourceId);
    
    const visitors = await prisma.visitor.findMany({
      where: {
        id: { in: visitorIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        purpose: true,
        status: true,
        securityLabel: true,
        scheduledStart: true,
        scheduledEnd: true,
        scheduledDate: true,
        actualCheckIn: true,
        actualCheckOut: true,
      },
    });

    const visitorsWithPermissions = visitors.map((visitor) => {
      const sharedData = sharedVisitors.find((sv) => sv.resourceId === visitor.id);
      return {
        ...visitor,
        permissions: sharedData?.permissions || {
          read: false,
          write: false,
          delete: false,
          share: false,
          execute: false,
        },
        sharedBy: sharedData?.owner,
        grantedAt: sharedData?.grantedAt,
        expiresAt: sharedData?.expiresAt,
      };
    });

    return NextResponse.json({
      visitors: visitorsWithPermissions,
      count: visitorsWithPermissions.length,
    });
  } catch (error) {
    console.error("Get shared visitors error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared visitors" },
      { status: 500 }
    );
  }
}

