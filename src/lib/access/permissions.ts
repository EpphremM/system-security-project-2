import { UserRole } from "@prisma/client";

export type Permission = 
  | "visitor:create"
  | "visitor:read"
  | "visitor:update"
  | "visitor:delete"
  | "visitor:checkin"
  | "visitor:checkout"
  | "user:read"
  | "user:create"
  | "user:update"
  | "user:delete"
  | "log:read"
  | "admin:all";

const rolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: [
    "admin:all",
    "visitor:create",
    "visitor:read",
    "visitor:update",
    "visitor:delete",
    "visitor:checkin",
    "visitor:checkout",
    "user:read",
    "user:create",
    "user:update",
    "user:delete",
    "log:read",
  ],
  SECURITY: [
    "visitor:read",
    "visitor:checkin",
    "visitor:checkout",
    "visitor:update",
    "log:read",
  ],
  RECEPTIONIST: [
    "visitor:create",
    "visitor:read",
    "visitor:update",
    "visitor:checkin",
    "visitor:checkout",
  ],
  USER: [
    "visitor:create",
    "visitor:read",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.includes(permission) || permissions.includes("admin:all");
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Insufficient permissions. Required: ${permission}`);
  }
}


