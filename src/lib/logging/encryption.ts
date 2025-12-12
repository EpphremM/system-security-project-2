import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { prisma } from "@/lib/prisma";
import { LogCategory } from "@/generated/prisma/enums";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits for GCM

// Master key for encrypting key material (should be in HSM in production)
const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY || randomBytes(KEY_LENGTH).toString("hex");

/**
 * Get or create active encryption key for category
 */
export async function getActiveKey(category: LogCategory): Promise<string> {
  const now = new Date();
  
  // Find active key that hasn't expired
  let key = await prisma.encryptionKey.findFirst({
    where: {
      category,
      isActive: true,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // If no active key or key expires soon (within 7 days), create new one
  if (!key || (key.expiresAt.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000) {
    key = await createNewKey(category);
  }

  // Decrypt key material
  return decryptKeyMaterial(key.keyMaterial);
}

/**
 * Create new encryption key for category
 */
async function createNewKey(category: LogCategory) {
  // Generate new key
  const keyMaterial = randomBytes(KEY_LENGTH);
  
  // Encrypt key material with master key
  const encryptedKeyMaterial = encryptKeyMaterial(keyMaterial.toString("hex"));
  
  // Deactivate old keys for this category
  await prisma.encryptionKey.updateMany({
    where: {
      category,
      isActive: true,
    },
    data: {
      isActive: false,
      rotatedAt: new Date(),
    },
  });

  // Create new key
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90); // 90 days

  return await prisma.encryptionKey.create({
    data: {
      keyId: `key-${category}-${Date.now()}`,
      category,
      keyMaterial: encryptedKeyMaterial,
      algorithm: ALGORITHM,
      keySize: 256,
      expiresAt,
      isActive: true,
    },
  });
}

/**
 * Encrypt log data
 */
export async function encryptLogData(
  data: string,
  category: LogCategory
): Promise<{
  encrypted: string;
  iv: string;
  tag: string;
  keyId: string;
}> {
  const key = await getActiveKey(category);
  const keyBuffer = Buffer.from(key, "hex");
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  // Update key usage
  const activeKey = await prisma.encryptionKey.findFirst({
    where: {
      category,
      isActive: true,
    },
  });

  if (activeKey) {
    await prisma.encryptionKey.update({
      where: { id: activeKey.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    keyId: activeKey?.keyId || "",
  };
}

/**
 * Decrypt log data
 */
export async function decryptLogData(
  encrypted: string,
  iv: string,
  tag: string,
  keyId: string
): Promise<string> {
  // Find key
  const keyRecord = await prisma.encryptionKey.findUnique({
    where: { keyId },
  });

  if (!keyRecord) {
    throw new Error(`Encryption key not found: ${keyId}`);
  }

  // Decrypt key material
  const key = decryptKeyMaterial(keyRecord.keyMaterial);
  const keyBuffer = Buffer.from(key, "hex");
  const ivBuffer = Buffer.from(iv, "hex");
  const tagBuffer = Buffer.from(tag, "hex");

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
  decipher.setAuthTag(tagBuffer);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypt key material with master key
 */
function encryptKeyMaterial(keyMaterial: string): string {
  const masterKey = Buffer.from(MASTER_KEY.substring(0, KEY_LENGTH * 2), "hex");
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, masterKey, iv);
  let encrypted = cipher.update(keyMaterial, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  // Combine IV, tag, and encrypted data
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt key material with master key
 */
function decryptKeyMaterial(encrypted: string): string {
  const [ivHex, tagHex, encryptedData] = encrypted.split(":");
  const masterKey = Buffer.from(MASTER_KEY.substring(0, KEY_LENGTH * 2), "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Rotate encryption keys (should be run as scheduled job)
 */
export async function rotateKeys() {
  const now = new Date();
  const rotationThreshold = new Date();
  rotationThreshold.setDate(rotationThreshold.getDate() - 83); // 7 days before expiration

  // Find keys that need rotation
  const keysToRotate = await prisma.encryptionKey.findMany({
    where: {
      isActive: true,
      createdAt: {
        lte: rotationThreshold,
      },
    },
  });

  const categories = new Set(keysToRotate.map((k) => k.category));

  for (const category of categories) {
    await createNewKey(category as LogCategory);
  }

  return {
    rotated: categories.size,
    keys: keysToRotate.length,
  };
}

/**
 * HSM integration placeholder (for future HSM implementation)
 */
export async function getHSMKey(keyId: string): Promise<Buffer> {
  // In production, this would interface with HSM
  // For now, return error indicating HSM not configured
  throw new Error("HSM not configured. Use software key management.");
}



