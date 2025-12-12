import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/access/unified-access-control";
import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  department: z.string().optional(),
  legacyRole: z.nativeEnum(UserRole).optional(),
  securityClearance: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check access - only SUPER_ADMIN and ADMIN can view user details
    const accessCheck = await checkAccess(request, {
      resourceType: "user",
      resourceId: params.id,
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

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        legacyRole: true,
        securityClearance: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        accountLockedUntil: true,
        failedLoginAttempts: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check access - only SUPER_ADMIN and ADMIN can edit users
    const accessCheck = await checkAccess(request, {
      resourceType: "user",
      resourceId: params.id,
      action: "write",
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

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Get current user to check if email is actually changing
    const currentUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { email: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Only check if email is being changed to a different value
    if (parsed.data.email && parsed.data.email !== currentUser.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: parsed.data.email,
          id: { not: params.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.name && { name: parsed.data.name }),
        ...(parsed.data.email && { email: parsed.data.email }),
        ...(parsed.data.department && { department: parsed.data.department }),
        ...(parsed.data.legacyRole && { legacyRole: parsed.data.legacyRole }),
        ...(parsed.data.securityClearance && { securityClearance: parsed.data.securityClearance as any }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        legacyRole: true,
        securityClearance: true,
        updatedAt: true,
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        category: "USER_ACTIVITY",
        logType: "DATA_UPDATE",
        action: "user.updated",
        resource: "user",
        resourceId: params.id,
        details: {
          updatedFields: Object.keys(parsed.data),
          updatedBy: session.user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Prevent self-deletion
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check access - only SUPER_ADMIN can delete users
    const userRole = (session.user.role as string) || "USER";
    if (userRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only SUPER_ADMIN can delete users" },
        { status: 403 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id: params.id },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        category: "USER_ACTIVITY",
        logType: "DATA_DELETE",
        action: "user.deleted",
        resource: "user",
        resourceId: params.id,
        details: {
          deletedUserEmail: user.email,
          deletedBy: session.user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

