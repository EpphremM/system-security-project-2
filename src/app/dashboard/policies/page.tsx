import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PolicyManagement } from "@/components/dashboard/policy-management";

export default async function PoliciesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Policy Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage access control policies and compliance
        </p>
      </div>
      <PolicyManagement />
    </div>
  );
}

