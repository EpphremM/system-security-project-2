"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordStrengthMeter } from "@/components/registration/password-strength-meter";
import Link from "next/link";

export default function RecoverAccountPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const tokenParam = searchParams.get("token");
    
    if (emailParam && tokenParam) {
      setEmail(emailParam);
      setToken(tokenParam);
      setStep("reset");
    }
  }, [searchParams]);

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/recover-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Recovery request failed");
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/recover-account", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          token,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Password reset failed");
        if (result.details) {
          setError(result.error + ": " + result.details.join(", "));
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success && step === "request") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recovery Email Sent</CardTitle>
          <CardDescription>
            If an account exists with this email, a recovery link has been sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/login">Back to Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (success && step === "reset") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Password Reset Successful!</CardTitle>
          <CardDescription>
            Your password has been reset. Redirecting to login...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "reset") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 12 characters"
                required
                disabled={loading}
                minLength={12}
              />
              {newPassword && <PasswordStrengthMeter password={newPassword} />}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading}
                minLength={12}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetting Password..." : "Reset Password"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/auth/login" className="text-primary underline">
                Back to Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Recover Account</CardTitle>
        <CardDescription>
          Enter your email address to receive a password reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRequestRecovery} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Recovery Link"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href="/auth/login" className="text-primary underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}





