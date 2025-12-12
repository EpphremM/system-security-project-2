import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkInVisitor, checkOutVisitor, automaticCheckOut, getVisitorQRCode } from "@/lib/visitors/checkin";
import { z } from "zod";

const checkInSchema = z.object({
  visitorId: z.string().uuid(),
  qrCode: z.string().optional(),
  idVerified: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const result = await checkInVisitor(parsed.data.visitorId, session.user.id, {
      qrCode: parsed.data.qrCode,
      idVerified: parsed.data.idVerified,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Check-in visitor error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check in visitor" },
      { status: 500 }
    );
  }
}

const checkOutSchema = z.object({
  visitorId: z.string().uuid(),
  badgeReturned: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = checkOutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const result = await checkOutVisitor(parsed.data.visitorId, session.user.id, {
      badgeReturned: parsed.data.badgeReturned,
      notes: parsed.data.notes,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Check-out visitor error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check out visitor" },
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "auto-checkout") {
      // Automatic check-out job
      const result = await automaticCheckOut();
      return NextResponse.json({
        success: true,
        ...result,
      });
    } else if (action === "qr-code") {
      const visitorId = searchParams.get("visitorId");
      if (!visitorId) {
        return NextResponse.json(
          { error: "visitorId is required" },
          { status: 400 }
        );
      }
      const qrCode = await getVisitorQRCode(visitorId);
      return NextResponse.json({
        qrCode,
      });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Check-in/out error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}



