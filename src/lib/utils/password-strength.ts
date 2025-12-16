import zxcvbn from "zxcvbn";

export interface PasswordStrength {
  score: number; 
  feedback: string[];
  crackTime: string;
  strength: "weak" | "fair" | "good" | "strong" | "very-strong";
}


export function calculatePasswordStrength(password: string): PasswordStrength {
  const result = zxcvbn(password);
  
  const strengthMap: Record<number, PasswordStrength["strength"]> = {
    0: "weak",
    1: "fair",
    2: "good",
    3: "strong",
    4: "very-strong",
  };

  const crackTimeMap: Record<number, string> = {
    0: "instant",
    1: "seconds",
    2: "minutes",
    3: "hours",
    4: "centuries",
  };

  return {
    score: result.score,
    feedback: result.feedback.suggestions.length > 0 
      ? result.feedback.suggestions 
      : ["Password looks good!"],
    crackTime: crackTimeMap[result.score] || "unknown",
    strength: strengthMap[result.score] || "weak",
  };
}


export function getPasswordStrengthColor(strength: PasswordStrength["strength"]): string {
  const colors = {
    weak: "text-red-500",
    fair: "text-orange-500",
    good: "text-yellow-500",
    strong: "text-green-500",
    "very-strong": "text-green-600",
  };
  return colors[strength];
}


export function getPasswordStrengthProgress(score: number): number {
  return ((score + 1) / 5) * 100; 
}





