import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySharingLink, useSharingLink } from "@/lib/access/sharing";
import { auth } from "@/lib/auth";

const verifySchema = z.object({
  token: z.string(),
  password: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const result = await verifySharingLink(token, password, userEmail);

    if (!result.allowed) {
      return NextResponse.json(
        { error: result.reason, allowed: false },
        { status: 403 }
      );
    }

    
    await useSharingLink(token);

    return NextResponse.json({
      allowed: true,
      link: {
        id: result.link?.id,
        resourceId: result.link?.resourceId,
        canRead: result.link?.canRead,
        canWrite: result.link?.canWrite,
        canExecute: result.link?.canExecute,
        canDelete: result.link?.canDelete,
        canShare: result.link?.canShare,
      },
    });
  } catch (error) {
    console.error("Verify sharing link error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify sharing link" },
      { status: 500 }
    );
  }
}



