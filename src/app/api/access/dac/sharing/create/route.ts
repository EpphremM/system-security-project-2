import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { createSharingLink } from "@/lib/access/sharing";

const createSchema = z.object({
  resourceType: z.string(),
  resourceId: z.string(),
  canRead: z.boolean().optional(),
  canWrite: z.boolean().optional(),
  canExecute: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  canShare: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().positive().optional(),
  password: z.string().optional(),
  requireAuth: z.boolean().optional(),
  allowedEmails: z.array(z.string().email()).optional(),
  allowedDomains: z.array(z.string()).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
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

    const {
      resourceType,
      resourceId,
      canRead,
      canWrite,
      canExecute,
      canDelete,
      canShare,
      expiresAt,
      maxUses,
      password,
      requireAuth,
      allowedEmails,
      allowedDomains,
      name,
      description,
    } = parsed.data;

    const link = await createSharingLink(resourceType, resourceId, session.user.id, {
      canRead,
      canWrite,
      canExecute,
      canDelete,
      canShare,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      maxUses,
      password,
      requireAuth,
      allowedEmails,
      allowedDomains,
      name,
      description,
    });

    
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const sharingUrl = `${baseUrl}/share/${link.token}`;

    return NextResponse.json({
      success: true,
      link: {
        ...link,
        url: sharingUrl,
      },
      message: "Sharing link created successfully",
    });
  } catch (error) {
    console.error("Create sharing link error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create sharing link" },
      { status: 500 }
    );
  }
}



