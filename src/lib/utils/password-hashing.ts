import argon2 from "argon2";
import { randomBytes } from "crypto";


const PEPPER = process.env.PASSWORD_PEPPER || "default-pepper-change-in-production";


export async function hashPassword(password: string): Promise<string> {
  
  const pepperedPassword = password + PEPPER;
  
  
  const salt = randomBytes(32);
  
  
  
  
  
  
  
  const hash = await argon2.hash(pepperedPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, 
    timeCost: 3, 
    parallelism: 4, 
    salt: salt,
    saltLength: 32,
    hashLength: 32,
  });
  
  return hash;
}


export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    
    const pepperedPassword = password + PEPPER;
    
    
    return await argon2.verify(hash, pepperedPassword);
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}


export async function needsRehash(hash: string): Promise<boolean> {
  
  
  
  return !hash.startsWith("$argon2id$");
}


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






