import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { evaluateAccessRule } from "@/lib/access/rubac";
import { extractClientMetadata } from "@/lib/utils/bot-prevention";

const evaluateSchema = z.object({
  ruleId: z.string().uuid(),
  deviceId: z.string().optional(),
  deviceInfo: z.any().optional(),
  geoLocation: z.object({
    country: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
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

    const metadata = extractClientMetadata(request);
    const body = await request.json();
    const parsed = evaluateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { ruleId, deviceId, deviceInfo, geoLocation } = parsed.data;

    const result = await evaluateAccessRule(ruleId, {
      ipAddress: metadata.ipAddress,
      userId: session.user.id,
      deviceId,
      deviceInfo,
      geoLocation,
      currentTime: new Date(),
    });

    if (!result.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          reason: result.reason,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      allowed: true,
    });
  } catch (error) {
    console.error("Evaluate rule error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to evaluate rule" },
      { status: 500 }
    );
  }
}



