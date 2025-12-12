import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserDevices, updateDeviceTrustLevel, blockDevice } from "@/lib/access/device";
import { z } from "zod";
import { TrustLevel } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const devices = await getUserDevices(session.user.id);

    return NextResponse.json({
      devices,
      count: devices.length,
    });
  } catch (error) {
    console.error("Get devices error:", error);
    return NextResponse.json(
      { error: "Failed to get devices" },
      { status: 500 }
    );
  }
}

const updateTrustSchema = z.object({
  deviceId: z.string(),
  trustLevel: z.nativeEnum(TrustLevel),
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
    const parsed = updateTrustSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { deviceId, trustLevel } = parsed.data;

    const device = await updateDeviceTrustLevel(deviceId, trustLevel, session.user.id);

    return NextResponse.json({
      success: true,
      device,
      message: "Device trust level updated successfully",
    });
  } catch (error) {
    console.error("Update device trust error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update device trust" },
      { status: 500 }
    );
  }
}

const blockSchema = z.object({
  deviceId: z.string(),
  reason: z.string().optional(),
});

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = blockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { deviceId, reason } = parsed.data;

    const device = await blockDevice(deviceId, session.user.id, reason);

    return NextResponse.json({
      success: true,
      device,
      message: "Device blocked successfully",
    });
  } catch (error) {
    console.error("Block device error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to block device" },
      { status: 500 }
    );
  }
}



