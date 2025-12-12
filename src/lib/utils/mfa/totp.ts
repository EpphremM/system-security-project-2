import { authenticator, totp } from "otplib";
import { randomBytes } from "crypto";
import { hash } from "@/lib/utils/crypto";

/**
 * Generate a new TOTP secret for a user
 */
export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate a TOTP URI for QR code generation
 */
export function generateTOTPURI(
  secret: string,
  email: string,
  issuer: string = "Visitor Management System"
): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Verify a TOTP code
 */
export function verifyTOTPCode(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    return false;
  }
}

/**
 * Check if TOTP code is valid (with window for clock skew)
 */
export function checkTOTPCode(
  secret: string,
  token: string,
  window: number = 1
): boolean {
  try {
    return authenticator.check(token, secret, { window });
  } catch (error) {
    return false;
  }
}

/**
 * Generate backup codes (10 codes, each 8 characters)
 */
export async function generateBackupCodes(): Promise<string[]> {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code for storage
 */
export async function hashBackupCode(code: string): Promise<string> {
  return hash(code);
}

/**
 * Verify a backup code against hashed codes
 */
export async function verifyBackupCode(
  code: string,
  hashedCode: string
): Promise<boolean> {
  const hashedInput = await hashBackupCode(code);
  return hashedInput === hashedCode;
}

/**
 * Generate emergency access token
 */
export function generateEmergencyToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash emergency token for storage
 */
export async function hashEmergencyToken(token: string): Promise<string> {
  return hash(token);
}

/**
 * Verify emergency token
 */
export async function verifyEmergencyToken(
  token: string,
  hashedToken: string
): Promise<boolean> {
  const hashedInput = await hashEmergencyToken(token);
  return hashedInput === hashedToken;
}



