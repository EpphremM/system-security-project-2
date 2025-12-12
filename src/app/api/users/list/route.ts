import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/access/unified-access-control";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check access - only SUPER_ADMIN and ADMIN can list all users
    const accessCheck = await checkAccess(request, {
      resourceType: "user",
      action: "read",
      routePath: "/dashboard/users",
      requiredPermission: "manage_users",
      checkRBAC: true,
      checkMAC: false,
      checkDAC: false,
      checkRuBAC: false,
      checkABAC: false,
    });

    if (!accessCheck.allowed) {
      return accessCheck.response || NextResponse.json(
        { error: "Access Denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const department = searchParams.get("department") || "";

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.legacyRole = role;
    }

    if (department) {
      where.department = { contains: department, mode: "insensitive" };
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
          legacyRole: true,
          securityClearance: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          accountLockedUntil: true,
          failedLoginAttempts: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

