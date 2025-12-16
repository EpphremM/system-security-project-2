import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission as checkDACPermission } from "@/lib/access/dac";


export async function enforceDAC(
  request: NextRequest,
  resourceType: string,
  resourceId: string,
  action: string
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
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { legacyRole: true },
    });

    if (user?.legacyRole === "SUPER_ADMIN") {
      return { allowed: true };
    }

    
    if (resourceType === "visitor") {
      const { prisma } = await import("@/lib/prisma");
      const visitor = await prisma.visitor.findUnique({
        where: { id: resourceId },
        select: { hostId: true },
      });

      if (visitor) {
        
        if (visitor.hostId === session.user.id) {
          return { allowed: true };
        }
      }
    }

    
    const permissionMap: Record<string, "read" | "write" | "execute" | "delete" | "share"> = {
      read: "read",
      view: "read",
      get: "read",
      write: "write",
      update: "write",
      edit: "write",
      create: "write",
      delete: "delete",
      remove: "delete",
      execute: "execute",
      run: "execute",
      share: "share",
    };

    const permission = permissionMap[action.toLowerCase()] || "read";

    
    const result = await checkDACPermission(
      session.user.id,
      resourceType,
      resourceId,
      permission
    );

    if (!result.allowed) {
      
      if (resourceType === "visitor" && result.reason === "Resource not found") {
        return {
          allowed: false,
          response: NextResponse.json(
            {
              error: "Access denied by DAC policy",
              reason: "You don't have permission to access this visitor",
              resourceType,
              resourceId,
              action,
            },
            { status: 403 }
          ),
        };
      }

      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: "Access denied by DAC policy",
            reason: result.reason || "You don't have permission to access this resource",
            resourceType,
            resourceId,
            action,
          },
          { status: 403 }
        ),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("DAC enforcement error:", error);
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Failed to check access permissions",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      ),
    };
  }
}

