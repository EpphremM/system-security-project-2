"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Copy, Check } from "lucide-react";
import { MFASetupModal } from "@/components/auth/mfa-setup-modal";

export default function MFASetupPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [manualCode, setManualCode] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    
    fetchTOTPSetup();
  }, []);

  const fetchTOTPSetup = async () => {
    try {
      const response = await fetch("/api/auth/mfa/totp/setup", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to setup TOTP");
      }

      const result = await response.json();
      setQrCode(result.qrCodeUrl);
      setSecret(result.secret);
      setManualCode(result.manualEntryKey);
    } catch (err) {
      console.error("TOTP setup error:", err);
      setError("Failed to setup MFA. Please try again.");
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/mfa/totp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: verificationCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Verification failed");
        setLoading(false);
        return;
      }

      
      const backupResponse = await fetch("/api/auth/mfa/backup-codes", {
        method: "GET",
      });

      if (backupResponse.ok) {
        const backupResult = await backupResponse.json();
        setBackupCodes(backupResult.codes || []);
      }

      
      router.push("/dashboard");
    } catch (err) {
      console.error("MFA verification error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (manualCode) {
      navigator.clipboard.writeText(manualCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadBackupCodes = () => {
    const content = backupCodes.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mfa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Setup Multi-Factor Authentication</CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app or enter the code manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {qrCode && (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg border">
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              </div>

              <div className="w-full space-y-2">
                <Label>Manual Entry Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={manualCode}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopySecret}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this code if you can't scan the QR code
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="verificationCode">Verification Code</Label>
            <Input
              id="verificationCode"
              type="text"
              placeholder="Enter 6-digit code from your app"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Enter the code displayed in your authenticator app to verify setup
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleVerify}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1"
            >
              {loading ? "Verifying..." : "Verify & Complete Setup"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
            >
              Skip for Now
            </Button>
          </div>

          {backupCodes.length > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Backup Codes</h3>
                  <p className="text-sm text-muted-foreground">
                    Save these codes in a safe place. You can use them if you lose access to your authenticator.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadBackupCodes}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-background rounded border">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



