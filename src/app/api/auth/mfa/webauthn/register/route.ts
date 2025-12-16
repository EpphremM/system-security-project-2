import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateWebAuthnRegistrationOptions } from "@/lib/utils/mfa/webauthn";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const deviceName = body.deviceName || "Unknown Device";

    const options = await generateWebAuthnRegistrationOptions(
      session.user.id,
      session.user.email,
      session.user.name || session.user.email
    );

    
    

    return NextResponse.json({
      options,
      challenge: options.challenge,
    });
  } catch (error) {
    console.error("WebAuthn registration error:", error);
    return NextResponse.json(
      { error: "Failed to generate WebAuthn registration options" },
      { status: 500 }
    );
  }
}



