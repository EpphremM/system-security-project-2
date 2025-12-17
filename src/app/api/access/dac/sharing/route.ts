import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getResourceSharingLinks } from "@/lib/access/sharing";

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
    const resourceType = searchParams.get("resourceType");
    const resourceId = searchParams.get("resourceId");

    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { error: "resourceType and resourceId are required" },
        { status: 400 }
      );
    }

    const links = await getResourceSharingLinks(resourceType, resourceId, session.user.id);

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const linksWithUrls = links.map((link) => ({
      ...link,
      url: `${baseUrl}/share/${link.token}`,
      token: undefined, 

    }));

    return NextResponse.json({
      links: linksWithUrls,
      count: links.length,
    });
  } catch (error) {
    console.error("Get sharing links error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get sharing links" },
      { status: 500 }
    );
  }
}



