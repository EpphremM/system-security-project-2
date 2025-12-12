"use client";

import { SessionProvider } from "next-auth/react";
import { SessionTimeoutWarning } from "@/components/auth/session-timeout-warning";

export function SessionProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      {children}
      <SessionTimeoutWarning timeoutMinutes={30} warningMinutes={5} />
    </SessionProvider>
  );
}



