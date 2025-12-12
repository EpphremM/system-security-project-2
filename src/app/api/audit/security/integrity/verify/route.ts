import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyHashChain, detectTampering } from "@/lib/logging/integrity";
import { z } from "zod";

const verifySchema = z.object({
  category: z.enum(["SECURITY", "USER_ACTIVITY", "SYSTEM", "COMPLIANCE"]).optional(),
  logId: z.string().uuid().optional(),
  startSequence: z.number().int().optional(),
  endSequence: z.number().int().optional(),
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
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { category, logId, startSequence, endSequence } = parsed.data;

    if (logId) {
      // Verify single log
      const result = await detectTampering(logId);
      return NextResponse.json({
        valid: !result.tampered,
        tampered: result.tampered,
        reason: result.reason,
      });
    } else if (category) {
      // Verify hash chain for category
      const result = await verifyHashChain(
        category,
        startSequence,
        endSequence
      );
      return NextResponse.json({
        valid: result.valid,
        tamperedEntries: result.tamperedEntries,
        lastValidSequence: result.lastValidSequence,
      });
    } else {
      return NextResponse.json(
        { error: "Either logId or category must be provided" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Verify integrity error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify integrity" },
      { status: 500 }
    );
  }
}



