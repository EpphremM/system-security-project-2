

export type Role = 
  | "VISITOR"
  | "STAFF"
  | "DEPT_HEAD"
  | "HR"
  | "SECURITY"
  | "IT_ADMIN"
  | "SUPER_ADMIN"
  | "USER" 
  | "ADMIN" 
  | "RECEPTIONIST"; 

export const ROLE_HIERARCHY: Record<Role, number> = {
  VISITOR: 1,
  USER: 2,
  STAFF: 3,
  RECEPTIONIST: 4,
  DEPT_HEAD: 5,
  HR: 6,
  SECURITY: 7,
  IT_ADMIN: 8,
  ADMIN: 9,
  SUPER_ADMIN: 10,
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  VISITOR: ["view_own_visits"],
  USER: ["view_own_visits", "register_visitor"],
  STAFF: ["view_own_visits", "register_visitor", "view_department_visits"],
  RECEPTIONIST: ["view_all_visits", "check_in_visitor", "check_out_visitor"],
  DEPT_HEAD: [
    "view_department_visits",
    "approve_visitor",
    "view_department_reports",
  ],
  SECURITY: [
    "view_all_visits",
    "approve_visitor",
    "view_security_logs",
    "manage_incidents",
    "view_security_reports",
  ],
  HR: [
    "view_all_visits",
    "view_personnel_data",
    "manage_users",
    "view_hr_reports",
  ],
  IT_ADMIN: [
    "view_all_visits",
    "manage_system",
    "manage_backups",
    "view_system_logs",
  ],
  ADMIN: [
    "view_all_visits",
    "approve_visitor",
    "manage_users",
    "manage_roles",
    "view_all_reports",
    "manage_settings",
  ],
  SUPER_ADMIN: [
    "*", 
  ],
};

export function hasPermission(userRole: Role, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes("*") || permissions.includes(permission);
}

export function canAccessRoute(userRole: Role, route: string): boolean {
  
  if (userRole === "SUPER_ADMIN") {
    return true;
  }

  
  const routePermissions: Record<string, Role[]> = {
    "/dashboard": ["*"], 
    "/dashboard/visitors": ["*"],
    "/dashboard/visitors/approvals": ["ADMIN", "SUPER_ADMIN", "DEPT_HEAD", "SECURITY"],
    "/dashboard/checkin": ["RECEPTIONIST", "SECURITY", "ADMIN", "SUPER_ADMIN", "IT_ADMIN"],
    "/dashboard/security": ["SECURITY", "ADMIN", "SUPER_ADMIN", "IT_ADMIN"],
    "/dashboard/users": ["HR", "ADMIN", "SUPER_ADMIN", "IT_ADMIN"],
    "/dashboard/policies": ["ADMIN", "SUPER_ADMIN", "IT_ADMIN"],
    "/dashboard/incidents": ["SECURITY", "ADMIN", "SUPER_ADMIN"],
    "/dashboard/reports": ["DEPT_HEAD", "HR", "SECURITY", "ADMIN", "SUPER_ADMIN"],
    "/dashboard/settings": ["ADMIN", "SUPER_ADMIN", "IT_ADMIN"],
    "/dashboard/audit": ["SECURITY", "ADMIN", "SUPER_ADMIN", "IT_ADMIN"],
    "/dashboard/backup": ["IT_ADMIN", "ADMIN", "SUPER_ADMIN"],
  };

  const allowedRoles = routePermissions[route] || ["*"];
  return allowedRoles.includes("*") || allowedRoles.includes(userRole);
}

export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    VISITOR: "Visitor",
    USER: "User",
    STAFF: "Staff",
    RECEPTIONIST: "Receptionist",
    DEPT_HEAD: "Department Head",
    HR: "HR Manager",
    SECURITY: "Security Officer",
    IT_ADMIN: "IT Administrator",
    ADMIN: "Administrator",
    SUPER_ADMIN: "Super Administrator",
  };
  return displayNames[role] || role;
}



