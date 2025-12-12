"use client";

import { calculatePasswordStrength, getPasswordStrengthColor, getPasswordStrengthProgress } from "@/lib/utils/password-strength";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const strength = calculatePasswordStrength(password);
  const progress = getPasswordStrengthProgress(strength.score);
  const color = getPasswordStrengthColor(strength.strength);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password strength:</span>
        <span className={color}>{strength.strength.toUpperCase()}</span>
      </div>
      <Progress value={progress} className="h-2" />
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {strength.feedback.map((feedback, index) => (
            <li key={index}>• {feedback}</li>
          ))}
        </ul>
      )}
    </div>
  );
}




