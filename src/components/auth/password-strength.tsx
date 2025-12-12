"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const [strength, setStrength] = useState(0);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("");

  useEffect(() => {
    if (!password) {
      setStrength(0);
      setLabel("");
      return;
    }

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    };

    if (checks.length) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.number) score += 20;
    if (checks.special) score += 20;

    setStrength(score);

    if (score < 40) {
      setLabel("Weak");
      setColor("bg-red-500");
    } else if (score < 60) {
      setLabel("Fair");
      setColor("bg-orange-500");
    } else if (score < 80) {
      setLabel("Good");
      setColor("bg-yellow-500");
    } else {
      setLabel("Strong");
      setColor("bg-green-500");
    }
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password Strength</span>
        <span className="font-medium">{label}</span>
      </div>
      <Progress value={strength} className="h-2" />
      <div className="text-xs text-muted-foreground space-y-1">
        <div className={password.length >= 8 ? "text-green-600" : ""}>
          {password.length >= 8 ? "✓" : "○"} At least 8 characters
        </div>
        <div className={/[a-z]/.test(password) ? "text-green-600" : ""}>
          {/[a-z]/.test(password) ? "✓" : "○"} Lowercase letter
        </div>
        <div className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
          {/[A-Z]/.test(password) ? "✓" : "○"} Uppercase letter
        </div>
        <div className={/[0-9]/.test(password) ? "text-green-600" : ""}>
          {/[0-9]/.test(password) ? "✓" : "○"} Number
        </div>
        <div className={/[^a-zA-Z0-9]/.test(password) ? "text-green-600" : ""}>
          {/[^a-zA-Z0-9]/.test(password) ? "✓" : "○"} Special character
        </div>
      </div>
    </div>
  );
}



