import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    const alert = await prisma.alert.update({
      where: {
        id: params.id,
      },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      alert: {
        ...alert,
        createdAt: alert.createdAt.toISOString(),
        acknowledgedAt: alert.acknowledgedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Acknowledge alert error:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge alert" },
      { status: 500 }
    );
  }
}


