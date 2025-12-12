import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsManagement } from "@/components/dashboard/reports-management";

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-2 text-sm text-gray-600">
          Generate and manage compliance and security reports
        </p>
      </div>
      <ReportsManagement />
    </div>
  );
}

