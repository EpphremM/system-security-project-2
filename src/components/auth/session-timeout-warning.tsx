"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";

interface SessionTimeoutWarningProps {
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export function SessionTimeoutWarning({
  timeoutMinutes = 30,
  warningMinutes = 5,
}: SessionTimeoutWarningProps) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    let warningTimer: NodeJS.Timeout;
    let expiredTimer: NodeJS.Timeout;
    let countdownInterval: NodeJS.Timeout;

    const setupTimers = () => {
      const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000;
      const expiredTime = timeoutMinutes * 60 * 1000;

      // Clear existing timers
      if (warningTimer) clearTimeout(warningTimer);
      if (expiredTimer) clearTimeout(expiredTimer);
      if (countdownInterval) clearInterval(countdownInterval);

      // Set warning timer
      warningTimer = setTimeout(() => {
        setShowWarning(true);
        const remaining = warningMinutes * 60;
        setTimeRemaining(remaining);

        // Update countdown every second
        countdownInterval = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, warningTime);

      // Set expired timer
      expiredTimer = setTimeout(() => {
        setIsExpired(true);
        setShowWarning(false);
        handleLogout();
      }, expiredTime);
    };

    // Reset timers on user activity
    const resetTimers = () => {
      setupTimers();
    };

    // Listen for user activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(event, resetTimers, { passive: true });
    });

    setupTimers();

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(expiredTimer);
      clearInterval(countdownInterval);
      events.forEach((event) => {
        document.removeEventListener(event, resetTimers);
      });
    };
  }, [timeoutMinutes, warningMinutes]);

  const handleExtendSession = async () => {
    try {
      // Refresh session
      const response = await fetch("/api/auth/session/refresh", {
        method: "POST",
      });
      if (response.ok) {
        setShowWarning(false);
        setTimeRemaining(0);
      }
    } catch (error) {
      console.error("Failed to extend session:", error);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isExpired) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <DialogTitle>Session Expired</DialogTitle>
            </div>
            <DialogDescription>
              Your session has expired due to inactivity. Please log in again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={handleLogout}>Go to Login</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <DialogTitle>Session Timeout Warning</DialogTitle>
          </div>
          <DialogDescription>
            Your session will expire in {formatTime(timeRemaining)} due to inactivity.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
          <Button onClick={handleExtendSession}>Extend Session</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



