"use client";

import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const router = useRouter();

  const handleMFARequired = (userId: string, methods: string[]) => {
    // Redirect to MFA verification page
    router.push("/auth/verify-mfa");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <LoginForm onMFARequired={handleMFARequired} />
    </div>
  );
}
