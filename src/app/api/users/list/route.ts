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

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        legacyRole: true,
        securityClearance: true,
        clearance: {
          select: {
            level: true,
            status: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userRole = currentUser.legacyRole || (session.user.role as string) || "USER";
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "HR" || userRole === "IT_ADMIN";
    
    const clearanceLevel = currentUser.clearance?.level ?? currentUser.securityClearance;
    const clearanceStatus = currentUser.clearance?.status;
    const clearanceExpired = currentUser.clearance?.expiresAt ? currentUser.clearance.expiresAt < new Date() : false;
    const hasActiveClearanceRecord = currentUser.clearance && clearanceStatus === "ACTIVE" && !clearanceExpired;
    const hasTopSecretInSecurityClearance = currentUser.securityClearance === "TOP_SECRET";
    const hasTopSecretInClearanceRecord = currentUser.clearance?.level === "TOP_SECRET" && hasActiveClearanceRecord;
    const hasTopSecretClearance = hasTopSecretInSecurityClearance || hasTopSecretInClearanceRecord;
    
    if (!isAdmin && !hasTopSecretClearance) {
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
        console.error("Users list access denied:", {
          userId: session.user.id,
          role: userRole,
          securityClearance: currentUser.securityClearance,
          clearanceLevel: currentUser.clearance?.level,
          clearanceStatus: currentUser.clearance?.status,
          hasTopSecret: hasTopSecretClearance,
        });
        return accessCheck.response || NextResponse.json(
          { 
            error: "Access Denied",
            message: "You need admin role, TOP_SECRET clearance, or manage_users permission to view users list"
          },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const department = searchParams.get("department") || "";

    
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

