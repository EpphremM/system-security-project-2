import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateTOTPSecret,
  generateTOTPURI,
} from "@/lib/utils/mfa/totp";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    
    const secret = generateTOTPSecret();
    const uri = generateTOTPURI(secret, user.email, process.env.WEBAUTHN_RP_NAME || "Visitor Management System");

    
    
    

    return NextResponse.json({
      secret,
      uri,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(uri)}`,
    });
  } catch (error) {
    console.error("TOTP setup error:", error);
    return NextResponse.json(
      { error: "Failed to setup TOTP" },
      { status: 500 }
    );
  }
}



