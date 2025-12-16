import { authenticator, totp } from "otplib";
import { randomBytes } from "crypto";
import { hash } from "@/lib/utils/crypto";


export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}


export function generateTOTPURI(
  secret: string,
  email: string,
  issuer: string = "Visitor Management System"
): string {
  return authenticator.keyuri(email, issuer, secret);
}


export function verifyTOTPCode(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    return false;
  }
}


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


export async function generateBackupCodes(): Promise<string[]> {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}


export async function hashBackupCode(code: string): Promise<string> {
  return hash(code);
}


export async function verifyBackupCode(
  code: string,
  hashedCode: string
): Promise<boolean> {
  const hashedInput = await hashBackupCode(code);
  return hashedInput === hashedCode;
}


export function generateEmergencyToken(): string {
  return randomBytes(32).toString("hex");
}


export async function hashEmergencyToken(token: string): Promise<string> {
  return hash(token);
}


export async function verifyEmergencyToken(
  token: string,
  hashedToken: string
): Promise<boolean> {
  const hashedInput = await hashEmergencyToken(token);
  return hashedInput === hashedToken;
}



