import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { verifyWebAuthnRegistration } from "@/lib/utils/mfa/webauthn";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";

const verifySchema = z.object({
  response: z.any(), // RegistrationResponseJSON
  challenge: z.string(),
  deviceName: z.string().optional(),
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

    const { response, challenge, deviceName } = parsed.data;

    // Verify registration
    const { verified } = await verifyWebAuthnRegistration(
      session.user.id,
      response as RegistrationResponseJSON,
      challenge,
      deviceName
    );

    if (!verified) {
      return NextResponse.json(
        { error: "WebAuthn registration verification failed" },
        { status: 400 }
      );
    }

    // Enable MFA if not already enabled
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        mfaEnabled: true,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "mfa.webauthn_enabled",
        resource: "user",
        resourceId: session.user.id,
        securityLabel: "INTERNAL",
        details: {
          deviceName: deviceName || "Unknown Device",
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "WebAuthn device registered successfully",
    });
  } catch (error) {
    console.error("WebAuthn verify error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify WebAuthn registration" },
      { status: 500 }
    );
  }
}



