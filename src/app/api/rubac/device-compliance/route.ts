import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user agent
    const userAgent = request.headers.get("user-agent") || "";
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    const isSecure = request.headers.get("x-forwarded-proto") === "https" || 
                     request.url.startsWith("https://");

    // Basic device compliance check
    const deviceInfo = {
      userAgent,
      platform: isMobile ? "Mobile" : "Desktop",
      isMobile,
      isSecure,
      hasRequiredFeatures: true, // Would check for specific features
      complianceStatus: isSecure ? "COMPLIANT" : "WARNING" as const,
      issues: isSecure ? [] : ["Connection is not secure (HTTPS required)"],
    };

    return NextResponse.json(deviceInfo);
  } catch (error) {
    console.error("Device compliance check error:", error);
    return NextResponse.json(
      { error: "Failed to check device compliance" },
      { status: 500 }
    );
  }
}


