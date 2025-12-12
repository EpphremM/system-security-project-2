import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function VisitorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  // This is a nested layout, so it just passes through children
  // The parent dashboard layout already provides sidebar and header
  return <>{children}</>;
}

