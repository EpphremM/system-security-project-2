import { z } from "zod";
import zxcvbn from "zxcvbn";


const COMMON_PASSWORDS = [
  "password", "123456", "123456789", "12345678", "12345",
  "1234567", "1234567890", "qwerty", "abc123", "monkey",
  "1234567890", "letmein", "trustno1", "dragon", "baseball",
  "iloveyou", "master", "sunshine", "ashley", "bailey",
  "passw0rd", "shadow", "123123", "654321", "superman",
  "qazwsx", "michael", "football", "welcome", "jesus",
  "ninja", "mustang", "password1", "123456789", "admin",
];

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}


export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  
  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long");
  }

  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  // Dictionary attack prevention
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
    errors.push("Password contains common words or patterns");
  }

  // Check for repeated characters (e.g., "aaaaaa")
  if (/(.)\1{3,}/.test(password)) {
    warnings.push("Password contains repeated characters");
  }

  // Check for sequential characters (e.g., "12345", "abcde")
  if (/01234|12345|23456|34567|45678|56789|abcdef|bcdefg|cdefgh|defghi|efghij|fghijk|ghijkl|hijklm|ijklmn|jklmno|klmnop|lmnopq|mnopqr|nopqrs|opqrst|pqrstu|qrstuv|rstuvw|stuvwx|tuvwxy|uvwxyz/i.test(password)) {
    warnings.push("Password contains sequential characters");
  }

  // Check password strength with zxcvbn
  const strength = zxcvbn(password);
  if (strength.score < 3) {
    warnings.push("Password strength is weak. Consider using a stronger password.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Password policy schema for Zod validation
 */
export const passwordPolicySchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character")
  .refine(
    (password) => {
      const lowerPassword = password.toLowerCase();
      return !COMMON_PASSWORDS.some(common => lowerPassword.includes(common));
    },
    { message: "Password contains common words or patterns" }
  )
  .refine(
    (password) => {
      const strength = zxcvbn(password);
      return strength.score >= 2; // At least "fair" strength
    },
    { message: "Password is too weak" }
  );

/**
 * Check if password is expired (90 days)
 */
export function isPasswordExpired(passwordChangedAt: Date | null): boolean {
  if (!passwordChangedAt) return false;
  
  const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
  const now = new Date();
  const age = now.getTime() - passwordChangedAt.getTime();
  
  return age > maxAge;
}

/**
 * Calculate password expiration date
 */
export function calculatePasswordExpiration(passwordChangedAt: Date): Date {
  const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
  return new Date(passwordChangedAt.getTime() + maxAge);
}

/**
 * Get days until password expires
 */
export function getDaysUntilExpiration(passwordExpiresAt: Date | null): number | null {
  if (!passwordExpiresAt) return null;
  
  const now = new Date();
  const diff = passwordExpiresAt.getTime() - now.getTime();
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  
  return days > 0 ? days : 0;
}





