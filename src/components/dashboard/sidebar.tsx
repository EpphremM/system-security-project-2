"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Shield,
  FileText,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  UserPlus,
  QrCode,
  Database,
  FileSearch,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { canAccessRoute, type Role } from "@/lib/auth/roles";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["*"] },
  { name: "Visitors", href: "/dashboard/visitors", icon: UserPlus, roles: ["*"] },
  { name: "Approvals", href: "/dashboard/visitors/approvals", icon: Shield, roles: ["ADMIN", "SUPER_ADMIN", "DEPT_HEAD", "SECURITY"] },
  { name: "Check-in", href: "/dashboard/checkin", icon: QrCode, roles: ["RECEPTIONIST", "SECURITY", "ADMIN", "SUPER_ADMIN", "IT_ADMIN"] },
  { name: "Security", href: "/dashboard/security", icon: Shield, roles: ["SECURITY", "ADMIN", "SUPER_ADMIN", "IT_ADMIN"] },
  { name: "Users", href: "/dashboard/users", icon: Users, roles: ["HR", "ADMIN", "SUPER_ADMIN", "IT_ADMIN"] },
  { name: "Policies", href: "/dashboard/policies", icon: FileText, roles: ["ADMIN", "SUPER_ADMIN", "IT_ADMIN"] },
  { name: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle, roles: ["SECURITY", "ADMIN", "SUPER_ADMIN"] },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3, roles: ["DEPT_HEAD", "HR", "SECURITY", "ADMIN", "SUPER_ADMIN"] },
  { name: "Audit Logs", href: "/dashboard/audit", icon: FileSearch, roles: ["SECURITY", "ADMIN", "SUPER_ADMIN", "IT_ADMIN"] },
  { name: "Backup", href: "/dashboard/backup", icon: Database, roles: ["IT_ADMIN", "ADMIN", "SUPER_ADMIN"] },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN", "SUPER_ADMIN", "IT_ADMIN"] },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user?.role as Role) || "USER";

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-xl font-bold text-gray-900">Security Dashboard</h1>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation
                  .filter((item) => {
                    
                    if (item.roles.includes("*")) return true;
                    return item.roles.includes(userRole) || canAccessRoute(userRole, item.href);
                  })
                  .map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                            isActive
                              ? "bg-gray-50 text-blue-600"
                              : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-6 w-6 shrink-0",
                              isActive ? "text-blue-600" : "text-gray-400 group-hover:text-blue-600"
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </li>
            <li className="mt-auto">
              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
              >
                <LogOut className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-blue-600" aria-hidden="true" />
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

