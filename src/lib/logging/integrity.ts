import { createHash, createSign, createVerify } from "crypto";
import { prisma } from "@/lib/prisma";
import { LogCategory } from "@/generated/prisma/enums";


export function hashLogEntry(logData: {
  id: string;
  category: string;
  logType: string;
  action: string;
  resource: string;
  resourceId?: string;
  createdAt: Date;
  details?: any;
}): string {
  const dataString = JSON.stringify({
    id: logData.id,
    category: logData.category,
    logType: logData.logType,
    action: logData.action,
    resource: logData.resource,
    resourceId: logData.resourceId,
    createdAt: logData.createdAt.toISOString(),
    details: logData.details,
  });

  return createHash("sha256").update(dataString).digest("hex");
}


export async function addToHashChain(
  logId: string,
  category: LogCategory
): Promise<string> {
  
  const lastEntry = await prisma.hashChain.findFirst({
    where: { category },
    orderBy: { sequenceNumber: "desc" },
  });

  
  const log = await prisma.auditLog.findUnique({
    where: { id: logId },
  });

  if (!log) {
    throw new Error(`Log not found: ${logId}`);
  }

  // Generate hash
  const logHash = hashLogEntry({
    id: log.id,
    category: log.category,
    logType: log.logType,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId || undefined,
    createdAt: log.createdAt,
    details: log.details,
  });

  // Combine with previous hash if exists
  const chainInput = lastEntry
    ? `${lastEntry.currentHash}:${logHash}`
    : logHash;
  const currentHash = createHash("sha256").update(chainInput).digest("hex");

  // Create chain entry
  const chainEntry = await prisma.hashChain.create({
    data: {
      chainId: `chain-${category}-${Date.now()}`,
      category,
      previousHash: lastEntry?.currentHash || null,
      currentHash,
      logId,
      sequenceNumber: lastEntry ? lastEntry.sequenceNumber + 1 : 1,
    },
  });

  // Update log with hash chain info
  await prisma.auditLog.update({
    where: { id: logId },
    data: {
      hashChain: currentHash,
      previousHash: lastEntry?.currentHash || null,
    },
  });

  return currentHash;
}

/**
 * Verify hash chain integrity
 */
export async function verifyHashChain(
  category: LogCategory,
  startSequence?: number,
  endSequence?: number
): Promise<{
  valid: boolean;
  tamperedEntries: string[];
  lastValidSequence: number;
}> {
  const entries = await prisma.hashChain.findMany({
    where: {
      category,
      sequenceNumber: {
        gte: startSequence || 1,
        lte: endSequence || undefined,
      },
    },
    orderBy: { sequenceNumber: "asc" },
    include: {
      log: true,
    },
  });

  const tamperedEntries: string[] = [];
  let lastValidSequence = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const log = entry.log;

    // Generate expected hash
    const logHash = hashLogEntry({
      id: log.id,
      category: log.category,
      logType: log.logType,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId || undefined,
      createdAt: log.createdAt,
      details: log.details,
    });

    // Verify chain
    const chainInput = i > 0
      ? `${entries[i - 1].currentHash}:${logHash}`
      : logHash;
    const expectedHash = createHash("sha256").update(chainInput).digest("hex");

    if (expectedHash !== entry.currentHash) {
      tamperedEntries.push(entry.logId);
      
      // Mark log as tampered
      await prisma.auditLog.update({
        where: { id: entry.logId },
        data: { isTampered: true },
      });
    } else {
      lastValidSequence = entry.sequenceNumber;
    }
  }

  return {
    valid: tamperedEntries.length === 0,
    tamperedEntries,
    lastValidSequence,
  };
}

/**
 * Generate digital signature for log batch
 */
export async function signLogBatch(
  batchId: string,
  logIds: string[],
  signedBy: string
): Promise<string> {
  // Get logs
  const logs = await prisma.auditLog.findMany({
    where: { id: { in: logIds } },
    orderBy: { createdAt: "asc" },
  });

  // Create batch data
  const batchData = {
    batchId,
    logIds: logs.map((l) => l.id),
    timestamps: logs.map((l) => l.createdAt.toISOString()),
    hashes: logs.map((l) => l.hashChain || ""),
  };

  const dataString = JSON.stringify(batchData);

  // Generate signature (using RSA-SHA256)
  // In production, use proper key management
  const privateKey = process.env.SIGNING_PRIVATE_KEY || "";
  if (!privateKey) {
    throw new Error("Signing private key not configured");
  }

  const sign = createSign("RSA-SHA256");
  sign.update(dataString);
  sign.end();
  const signature = sign.sign(privateKey, "base64");

  // Create batch record
  await prisma.logBatch.create({
    data: {
      batchId,
      category: logs[0]?.category || "USER_ACTIVITY",
      logIds,
      signature,
      signatureAlgorithm: "RSA-SHA256",
      signedBy,
      signedAt: new Date(),
    },
  });

  return signature;
}

/**
 * Verify digital signature for log batch
 */
export async function verifyLogBatch(batchId: string): Promise<{
  valid: boolean;
  verified: boolean;
}> {
  const batch = await prisma.logBatch.findUnique({
    where: { batchId },
  });

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  // Get logs
  const logs = await prisma.auditLog.findMany({
    where: { id: { in: batch.logIds } },
    orderBy: { createdAt: "asc" },
  });

  // Recreate batch data
  const batchData = {
    batchId: batch.batchId,
    logIds: logs.map((l) => l.id),
    timestamps: logs.map((l) => l.createdAt.toISOString()),
    hashes: logs.map((l) => l.hashChain || ""),
  };

  const dataString = JSON.stringify(batchData);

  // Verify signature
  const publicKey = process.env.SIGNING_PUBLIC_KEY || "";
  if (!publicKey) {
    throw new Error("Signing public key not configured");
  }

  const verify = createVerify("RSA-SHA256");
  verify.update(dataString);
  verify.end();
  const valid = verify.verify(publicKey, batch.signature, "base64");

  // Update batch verification status
  if (valid) {
    await prisma.logBatch.update({
      where: { id: batch.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });
  }

  return {
    valid,
    verified: batch.verified,
  };
}

/**
 * Detect tampering in logs
 */
export async function detectTampering(
  logId: string
): Promise<{
  tampered: boolean;
  reason?: string;
}> {
  const log = await prisma.auditLog.findUnique({
    where: { id: logId },
    include: {
      hashChainEntry: true,
    },
  });

  if (!log) {
    throw new Error(`Log not found: ${logId}`);
  }

  // Check if already marked as tampered
  if (log.isTampered) {
    return { tampered: true, reason: "Log marked as tampered" };
  }

  // Verify hash chain if exists
  if (log.hashChainEntry) {
    const category = log.category as LogCategory;
    const verification = await verifyHashChain(
      category,
      log.hashChainEntry.sequenceNumber,
      log.hashChainEntry.sequenceNumber
    );

    if (!verification.valid) {
      await prisma.auditLog.update({
        where: { id: logId },
        data: { isTampered: true },
      });

      return {
        tampered: true,
        reason: "Hash chain verification failed",
      };
    }
  }

  return { tampered: false };
}



