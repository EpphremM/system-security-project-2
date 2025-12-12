import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createDigitalAccess, revokeDigitalAccess, usePrintQuota, verifyWebPortalToken } from "@/lib/visitors/digital-access";
import { z } from "zod";

const createSchema = z.object({
  visitorId: z.string().uuid(),
  wifiEnabled: z.boolean().optional(),
  networkAccessEnabled: z.boolean().optional(),
  webPortalEnabled: z.boolean().optional(),
  printingEnabled: z.boolean().optional(),
  bandwidthLimit: z.number().int().optional(),
  printQuota: z.number().int().optional(),
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
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const result = await createDigitalAccess(parsed.data.visitorId, {
      wifiEnabled: parsed.data.wifiEnabled,
      networkAccessEnabled: parsed.data.networkAccessEnabled,
      webPortalEnabled: parsed.data.webPortalEnabled,
      printingEnabled: parsed.data.printingEnabled,
      bandwidthLimit: parsed.data.bandwidthLimit,
      printQuota: parsed.data.printQuota,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Create digital access error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create digital access" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const visitorId = searchParams.get("visitorId");

    if (!visitorId) {
      return NextResponse.json(
        { error: "visitorId is required" },
        { status: 400 }
      );
    }

    await revokeDigitalAccess(visitorId);

    return NextResponse.json({
      success: true,
      message: "Digital access revoked successfully",
    });
  } catch (error) {
    console.error("Revoke digital access error:", error);
    return NextResponse.json(
      { error: "Failed to revoke digital access" },
      { status: 500 }
    );
  }
}

const printSchema = z.object({
  visitorId: z.string().uuid(),
  pages: z.number().int().min(1),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = printSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const result = await usePrintQuota(parsed.data.visitorId, parsed.data.pages);

    return NextResponse.json({
      success: result.allowed,
      remaining: result.remaining,
      message: result.allowed
        ? "Print quota used successfully"
        : "Print quota exceeded",
    });
  } catch (error) {
    console.error("Use print quota error:", error);
    return NextResponse.json(
      { error: "Failed to use print quota" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (token) {
      // Verify web portal token
      const result = await verifyWebPortalToken(token);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Verify token error:", error);
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 }
    );
  }
}

