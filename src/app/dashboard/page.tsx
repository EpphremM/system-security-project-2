import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SecurityOverview } from "@/components/dashboard/security-overview";
import { VisitorDashboard } from "@/components/dashboard/visitor-dashboard";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Check if user is a regular user (not admin/security/IT/HR)
  // Admin roles: ADMIN, SUPER_ADMIN, SECURITY, IT_ADMIN, HR
  const adminRoles = ["ADMIN", "SUPER_ADMIN", "SECURITY", "IT_ADMIN", "HR"];
  const isRegularUser = !session.user.role || !adminRoles.includes(session.user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back, {session.user.name || session.user.email}
        </p>
      </div>
      
      {isRegularUser ? (
        // Visitor Dashboard for regular users
        <VisitorDashboard userId={session.user.id} />
      ) : (
        // Admin Dashboard
        <>
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Security Alerts</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">System Status</p>
                  <p className="text-2xl font-bold text-green-600">Healthy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Overview Component */}
          <SecurityOverview />
        </>
      )}
    </div>
  );
}

