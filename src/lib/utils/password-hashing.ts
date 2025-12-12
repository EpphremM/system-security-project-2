import argon2 from "argon2";
import { randomBytes } from "crypto";

// Server-side pepper (should be in environment variable)
const PEPPER = process.env.PASSWORD_PEPPER || "default-pepper-change-in-production";

/**
 * Hash password using Argon2id with pepper
 */
export async function hashPassword(password: string): Promise<string> {
  // Add server-side pepper
  const pepperedPassword = password + PEPPER;
  
  // Generate unique salt
  const salt = randomBytes(32);
  
  // Hash with Argon2id
  // Parameters optimized for security vs performance:
  // - memoryCost: 65536 (64 MB) - memory usage
  // - timeCost: 3 - iterations
  // - parallelism: 4 - parallel threads
  // - type: argon2id - most secure variant
  const hash = await argon2.hash(pepperedPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3, // 3 iterations
    parallelism: 4, // 4 parallel threads
    salt: salt,
    saltLength: 32,
    hashLength: 32,
  });
  
  return hash;
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    // Add server-side pepper
    const pepperedPassword = password + PEPPER;
    
    // Verify with Argon2
    return await argon2.verify(hash, pepperedPassword);
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

/**
 * Check if password needs rehashing (if algorithm parameters changed)
 */
export async function needsRehash(hash: string): Promise<boolean> {
  // Argon2 hashes include parameters, so we can check if they match current settings
  // For simplicity, we'll check if hash starts with $argon2id$ (current format)
  // In production, parse the hash and compare parameters
  return !hash.startsWith("$argon2id$");
}

/**
 * Rehash password with updated parameters
 */
export async function rehashPassword(
  password: string,
  currentHash: string
): Promise<string | null> {
  const isValid = await verifyPassword(password, currentHash);
  if (!isValid) {
    return null;
  }
  
  return await hashPassword(password);
}




