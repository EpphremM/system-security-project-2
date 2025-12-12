import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ThreatDashboard } from "@/components/dashboard/threat-dashboard";
import { SessionsMonitor } from "@/components/dashboard/sessions-monitor";

export default async function SecurityPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Security Overview</h1>
        <p className="mt-2 text-sm text-gray-600">
          Real-time threat monitoring and security metrics
        </p>
      </div>
      <ThreatDashboard />
      <SessionsMonitor />
    </div>
  );
}

