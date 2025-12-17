"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyMFAPage() {
  const router = useRouter();
  const [method, setMethod] = useState<string>("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    
    const storedEmail = sessionStorage.getItem("mfa_email");
    const storedPassword = sessionStorage.getItem("mfa_password");
    const storedUserId = sessionStorage.getItem("mfa_userId");
    const storedMethods = sessionStorage.getItem("mfa_methods");

    if (!storedEmail || !storedPassword || !storedUserId) {
      router.push("/auth/login");
      return;
    }

    setEmail(storedEmail);
    setPassword(storedPassword);
    setUserId(storedUserId);
    
    if (storedMethods) {
      const methods = JSON.parse(storedMethods);
      setAvailableMethods(methods);
      if (methods.length > 0) {
        setMethod(methods[0]);
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login/verify-mfa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          method,
          code: method === "backup_code" || method === "email_otp" || method === "totp" ? code : undefined,
          token: method === "emergency_token" ? code : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "MFA verification failed");
        return;
      }

      
      sessionStorage.removeItem("mfa_email");
      sessionStorage.removeItem("mfa_password");
      sessionStorage.removeItem("mfa_userId");
      sessionStorage.removeItem("mfa_methods");

      
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOTP = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/mfa/email-otp/setup", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to send email OTP");
      } else {
        setError("");
        alert("Email OTP sent! Please check your email.");
      }
    } catch (err) {
      setError("Failed to send email OTP");
    } finally {
      setLoading(false);
    }
  };

  if (!email || !password || !userId) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify Your Identity</CardTitle>
        <CardDescription>
          Please complete multi-factor authentication to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="method">Verification Method</Label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={loading}
            >
              {availableMethods.includes("totp") && (
                <option value="totp">Authenticator App (TOTP)</option>
              )}
              {availableMethods.includes("email_otp") && (
                <option value="email_otp">Email OTP</option>
              )}
              {availableMethods.includes("backup_code") && (
                <option value="backup_code">Backup Code</option>
              )}
              {availableMethods.includes("emergency_token") && (
                <option value="emergency_token">Emergency Token</option>
              )}
              {availableMethods.includes("webauthn") && (
                <option value="webauthn">Security Key (WebAuthn)</option>
              )}
            </select>
          </div>

          {method === "email_otp" && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSendEmailOTP}
                disabled={loading}
                className="w-full"
              >
                Send Email OTP
              </Button>
            </div>
          )}

          {method !== "webauthn" && (
            <div className="space-y-2">
              <Label htmlFor="code">
                {method === "totp" && "Enter 6-digit code from your authenticator app"}
                {method === "email_otp" && "Enter 6-digit code from your email"}
                {method === "backup_code" && "Enter backup code"}
                {method === "emergency_token" && "Enter emergency token"}
              </Label>
              <Input
                id="code"
                type="text"
                placeholder={
                  method === "totp" || method === "email_otp"
                    ? "000000"
                    : "Enter code"
                }
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={loading}
                maxLength={method === "totp" || method === "email_otp" ? 6 : undefined}
              />
            </div>
          )}

          {method === "webauthn" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Click the button below to authenticate with your security key
              </p>
              <Button
                type="button"
                onClick={async () => {
                  try {
                    
                    const optionsResponse = await fetch(
                      `/api/auth/mfa/verify?userId=${userId}`
                    );
                    const optionsData = await optionsResponse.json();

                    

                    const credential = await navigator.credentials.get({
                      publicKey: optionsData.options,
                    });

                    if (!credential) {
                      setError("WebAuthn authentication failed");
                      return;
                    }

                    

                    const verifyResponse = await fetch("/api/auth/login/verify-mfa", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        email,
                        password,
                        method: "webauthn",
                        response: credential,
                        challenge: optionsData.challenge,
                      }),
                    });

                    const verifyResult = await verifyResponse.json();

                    if (!verifyResponse.ok) {
                      setError(verifyResult.error || "WebAuthn verification failed");
                      return;
                    }

                    

                    sessionStorage.removeItem("mfa_email");
                    sessionStorage.removeItem("mfa_password");
                    sessionStorage.removeItem("mfa_userId");
                    sessionStorage.removeItem("mfa_methods");

                    

                    router.push("/dashboard");
                    router.refresh();
                  } catch (err) {
                    setError("WebAuthn authentication failed");
                  }
                }}
                disabled={loading}
                className="w-full"
              >
                Authenticate with Security Key
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {method !== "webauthn" && (
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}



