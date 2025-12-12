import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IncidentManagement } from "@/components/dashboard/incident-management";

export default async function IncidentsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Incident Response</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track and manage security incidents
        </p>
      </div>
      <IncidentManagement />
    </div>
  );
}

