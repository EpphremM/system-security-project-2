import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { NextRequest } from "next/server";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; 
const IV_LENGTH = 12; 
const TAG_LENGTH = 16; 


const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || randomBytes(KEY_LENGTH).toString("hex");


export function encryptPassword(password: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, KEY_LENGTH * 2), "hex");
  const iv = randomBytes(IV_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}


export function decryptPassword(
  encrypted: string,
  iv: string,
  tag: string
): string {
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, KEY_LENGTH * 2), "hex");
  const ivBuffer = Buffer.from(iv, "hex");
  const tagBuffer = Buffer.from(tag, "hex");
  
  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(tagBuffer);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}


export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}


export function validateNonce(nonce: string, timestamp: number): boolean {
  const NONCE_WINDOW = 5 * 60 * 1000; 
  const now = Date.now();
  const age = now - timestamp;
  
  
  if (age < 0 || age > NONCE_WINDOW) {
    return false;
  }
  
  
  
  return true;
}


export function extractNonce(request: NextRequest): {
  nonce: string | null;
  timestamp: number | null;
  valid: boolean;
} {
  const nonce = request.headers.get("x-nonce");
  const timestampHeader = request.headers.get("x-timestamp");
  
  if (!nonce || !timestampHeader) {
    return { nonce: null, timestamp: null, valid: false };
  }
  
  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) {
    return { nonce, timestamp: null, valid: false };
  }
  
  const valid = validateNonce(nonce, timestamp);
  
  return { nonce, timestamp, valid };
}


export function checkTLSVersion(request: NextRequest): {
  version: string | null;
  secure: boolean;
} {
  
  const protocol = request.headers.get("x-forwarded-proto");
  const forwardedSsl = request.headers.get("x-forwarded-ssl");
  
  
  
  const isSecure = protocol === "https" || forwardedSsl === "on";
  
  return {
    version: isSecure ? "1.3" : null,
    secure: isSecure,
  };
}





