import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { registerDevice } from "@/lib/access/device";
import { DeviceType } from "@/generated/prisma/enums";
import { extractClientMetadata } from "@/lib/utils/bot-prevention";

const registerSchema = z.object({
  deviceId: z.string().min(1),
  deviceName: z.string().optional(),
  deviceType: z.nativeEnum(DeviceType),
  os: z.string().optional(),
  osVersion: z.string().optional(),
  browser: z.string().optional(),
  browserVersion: z.string().optional(),
  isCompanyManaged: z.boolean().optional(),
  hasAntiMalware: z.boolean().optional(),
  hasEncryptedStorage: z.boolean().optional(),
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
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      deviceId,
      deviceName,
      deviceType,
      os,
      osVersion,
      browser,
      browserVersion,
      isCompanyManaged,
      hasAntiMalware,
      hasEncryptedStorage,
    } = parsed.data;

    const device = await registerDevice(session.user.id, deviceId, {
      deviceName,
      deviceType,
      os,
      osVersion,
      browser,
      browserVersion,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      isCompanyManaged,
      hasAntiMalware,
      hasEncryptedStorage,
    });

    return NextResponse.json({
      success: true,
      device,
      message: "Device registered successfully",
    });
  } catch (error) {
    console.error("Register device error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register device" },
      { status: 500 }
    );
  }
}



