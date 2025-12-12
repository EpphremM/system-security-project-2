import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/dashboard/user-management";

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage users, permissions, and access reviews
        </p>
      </div>
      <UserManagement />
    </div>
  );
}

