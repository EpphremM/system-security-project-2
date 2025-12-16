import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessRoute, type Role } from "@/lib/auth/roles";


export async function checkRoleAccess(
  request: NextRequest,
  route: string
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        allowed: false,
        response: NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ),
      };
    }

    const userRole = (session.user.role as Role) || "USER";

    if (!canAccessRoute(userRole, route)) {
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: "Access Denied",
            message: "You don't have permission to access this resource",
            requiredRole: "Higher role required",
            yourRole: userRole,
          },
          { status: 403 }
        ),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("Role access check error:", error);
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ),
    };
  }
}



