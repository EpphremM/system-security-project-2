-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "digitalSignature" TEXT,
ADD COLUMN     "hashChain" TEXT,
ADD COLUMN     "isTampered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousHash" TEXT;

-- CreateTable
CREATE TABLE "encryption_keys" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "category" "LogCategory" NOT NULL,
    "keyMaterial" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "keySize" INTEGER NOT NULL DEFAULT 256,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rotatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hsmKeyId" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encryption_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hash_chains" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "category" "LogCategory" NOT NULL,
    "previousHash" TEXT,
    "currentHash" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hash_chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_batches" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "category" "LogCategory" NOT NULL,
    "logIds" TEXT[],
    "signature" TEXT NOT NULL,
    "signatureAlgorithm" TEXT NOT NULL DEFAULT 'RSA-SHA256',
    "signedBy" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_anomalies" (
    "id" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "logId" TEXT,
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "metadata" JSONB,

    CONSTRAINT "log_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siem_integrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "apiKey" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncInterval" INTEGER NOT NULL DEFAULT 3600,
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siem_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "encryption_keys_keyId_key" ON "encryption_keys"("keyId");

-- CreateIndex
CREATE INDEX "encryption_keys_category_idx" ON "encryption_keys"("category");

-- CreateIndex
CREATE INDEX "encryption_keys_isActive_idx" ON "encryption_keys"("isActive");

-- CreateIndex
CREATE INDEX "encryption_keys_expiresAt_idx" ON "encryption_keys"("expiresAt");

-- CreateIndex
CREATE INDEX "encryption_keys_keyId_idx" ON "encryption_keys"("keyId");

-- CreateIndex
CREATE UNIQUE INDEX "hash_chains_chainId_key" ON "hash_chains"("chainId");

-- CreateIndex
CREATE UNIQUE INDEX "hash_chains_logId_key" ON "hash_chains"("logId");

-- CreateIndex
CREATE INDEX "hash_chains_chainId_idx" ON "hash_chains"("chainId");

-- CreateIndex
CREATE INDEX "hash_chains_category_idx" ON "hash_chains"("category");

-- CreateIndex
CREATE INDEX "hash_chains_logId_idx" ON "hash_chains"("logId");

-- CreateIndex
CREATE INDEX "hash_chains_sequenceNumber_idx" ON "hash_chains"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "log_batches_batchId_key" ON "log_batches"("batchId");

-- CreateIndex
CREATE INDEX "log_batches_batchId_idx" ON "log_batches"("batchId");

-- CreateIndex
CREATE INDEX "log_batches_category_idx" ON "log_batches"("category");

-- CreateIndex
CREATE INDEX "log_batches_signedAt_idx" ON "log_batches"("signedAt");

-- CreateIndex
CREATE INDEX "log_anomalies_anomalyType_idx" ON "log_anomalies"("anomalyType");

-- CreateIndex
CREATE INDEX "log_anomalies_severity_idx" ON "log_anomalies"("severity");

-- CreateIndex
CREATE INDEX "log_anomalies_detectedAt_idx" ON "log_anomalies"("detectedAt");

-- CreateIndex
CREATE INDEX "log_anomalies_resolved_idx" ON "log_anomalies"("resolved");

-- CreateIndex
CREATE UNIQUE INDEX "siem_integrations_name_key" ON "siem_integrations"("name");

-- CreateIndex
CREATE INDEX "siem_integrations_enabled_idx" ON "siem_integrations"("enabled");

-- CreateIndex
CREATE INDEX "siem_integrations_type_idx" ON "siem_integrations"("type");

-- CreateIndex
CREATE INDEX "audit_logs_batchId_idx" ON "audit_logs"("batchId");

-- CreateIndex
CREATE INDEX "audit_logs_hashChain_idx" ON "audit_logs"("hashChain");

-- CreateIndex
CREATE INDEX "audit_logs_isTampered_idx" ON "audit_logs"("isTampered");

-- AddForeignKey
ALTER TABLE "hash_chains" ADD CONSTRAINT "hash_chains_logId_fkey" FOREIGN KEY ("logId") REFERENCES "audit_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
