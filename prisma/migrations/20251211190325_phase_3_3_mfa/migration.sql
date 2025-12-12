-- CreateTable
CREATE TABLE "mfa_backup_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_emergency_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_emergency_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_email_otps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_email_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mfa_backup_codes_userId_idx" ON "mfa_backup_codes"("userId");

-- CreateIndex
CREATE INDEX "mfa_backup_codes_userId_used_idx" ON "mfa_backup_codes"("userId", "used");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_emergency_tokens_token_key" ON "mfa_emergency_tokens"("token");

-- CreateIndex
CREATE INDEX "mfa_emergency_tokens_userId_idx" ON "mfa_emergency_tokens"("userId");

-- CreateIndex
CREATE INDEX "mfa_emergency_tokens_userId_used_idx" ON "mfa_emergency_tokens"("userId", "used");

-- CreateIndex
CREATE INDEX "mfa_emergency_tokens_expiresAt_idx" ON "mfa_emergency_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "mfa_email_otps_userId_idx" ON "mfa_email_otps"("userId");

-- CreateIndex
CREATE INDEX "mfa_email_otps_userId_used_expiresAt_idx" ON "mfa_email_otps"("userId", "used", "expiresAt");

-- CreateIndex
CREATE INDEX "mfa_email_otps_expiresAt_idx" ON "mfa_email_otps"("expiresAt");

-- AddForeignKey
ALTER TABLE "mfa_backup_codes" ADD CONSTRAINT "mfa_backup_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_emergency_tokens" ADD CONSTRAINT "mfa_emergency_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_email_otps" ADD CONSTRAINT "mfa_email_otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
