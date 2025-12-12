import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkReadAccess, checkWriteAccess } from "@/lib/access/mac";

/**
 * MAC middleware to enforce Bell-LaPadula rules
 * Use this middleware in API routes that access classified resources
 */
export async function enforceMAC(
  request: NextRequest,
  resourceType: string,
  resourceId: string,
  action: "read" | "write",
  targetLevel?: string,
  targetCompartments?: string[]
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  try {
    // SUPER_ADMIN bypass: Grant all MAC permissions
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { legacyRole: true },
    });

    if (user?.legacyRole === "SUPER_ADMIN") {
      return { allowed: true };
    }

    let result;
    if (action === "read") {
      result = await checkReadAccess(session.user.id, resourceType, resourceId);
    } else {
      result = await checkWriteAccess(
        session.user.id,
        resourceType,
        resourceId,
        targetLevel as any,
        targetCompartments
      );
    }

    if (!result.allowed) {
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: "Access denied",
            reason: result.reason,
            action,
            resourceType,
            resourceId,
          },
          { status: 403 }
        ),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("MAC enforcement error:", error);
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Failed to check access",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Helper to check if user is trusted subject (admin)
 */
export async function isTrustedSubject(userId: string): Promise<boolean> {
  const { getUserClearance } = await import("@/lib/access/mac");
  const clearance = await getUserClearance(userId);
  return clearance?.trustedSubject ?? false;
}

