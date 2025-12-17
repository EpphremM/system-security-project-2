import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkInVisitor, checkOutVisitor, automaticCheckOut, getVisitorQRCode } from "@/lib/visitors/checkin";
import { createHash } from "crypto";
import { z } from "zod";

const checkInSchema = z.object({
  visitorId: z.string().optional(),
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
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    let visitorId: string | null = null;
    let qrCodeData: string | undefined = undefined;

    const inputValue = parsed.data.visitorId || parsed.data.qrCode;

    if (inputValue) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(inputValue)) {
        visitorId = inputValue;
      } else {
        try {
          const qrData = JSON.parse(inputValue);
          if (qrData.visitorId) {
            visitorId = qrData.visitorId;
            qrCodeData = inputValue;
          }
        } catch {
          qrCodeData = inputValue;
        }
      }
    }

    if (!visitorId && qrCodeData) {
      try {
        const hashRegex = /^[0-9a-f]{64}$/i;
        let qrHash: string;
        
        if (hashRegex.test(qrCodeData)) {
          qrHash = qrCodeData;
        } else {
          qrHash = createHash("sha256").update(qrCodeData).digest("hex");
        }
        
        const visitor = await prisma.visitor.findFirst({
          where: { qrCode: qrHash },
          select: { id: true },
        });
        
        if (visitor) {
          visitorId = visitor.id;
        }
      } catch (err) {
        console.error("Error looking up visitor by QR code hash:", err);
      }
    }

    if (!visitorId) {
      return NextResponse.json(
        { error: "Visitor ID or valid QR code is required" },
        { status: 400 }
      );
    }

    const result = await checkInVisitor(visitorId, session.user.id, {
      qrCode: qrCodeData,
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
        { error: "Invalid input", details: parsed.error.issues },
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



