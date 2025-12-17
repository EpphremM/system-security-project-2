import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { canEdit: false, error: "Unauthorized" },
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
        { canEdit: false, error: "Visitor not found" },
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

    const canEdit = isHost || isSuperAdmin || isAdmin || isReceptionist;

    return NextResponse.json({
      canEdit,
    });
  } catch (error) {
    console.error("Check edit permission error:", error);
    return NextResponse.json(
      { canEdit: false, error: "Failed to check edit permission" },
      { status: 500 }
    );
  }
}

