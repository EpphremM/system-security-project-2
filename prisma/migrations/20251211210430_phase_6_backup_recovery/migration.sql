-- CreateEnum
CREATE TYPE "StorageLocation" AS ENUM ('PRIMARY', 'SECONDARY', 'TERTIARY', 'AIR_GAPPED');

-- CreateEnum
CREATE TYPE "SystemType" AS ENUM ('CRITICAL', 'IMPORTANT', 'NON_CRITICAL');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BackupType" ADD VALUE 'TRANSACTION_LOG';
ALTER TYPE "BackupType" ADD VALUE 'CONFIGURATION';

-- AlterTable
ALTER TABLE "backup_logs" ADD COLUMN     "airGappedPath" TEXT,
ADD COLUMN     "consistencyCheckResults" JSONB,
ADD COLUMN     "encryptionAlgorithm" TEXT DEFAULT 'AES-256-GCM',
ADD COLUMN     "postBackupChecksPassed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preBackupChecksPassed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "primaryPath" TEXT,
ADD COLUMN     "restorationTestDate" TIMESTAMP(3),
ADD COLUMN     "restorationTestNotes" TEXT,
ADD COLUMN     "restorationTestResult" TEXT,
ADD COLUMN     "restorationTested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduleType" TEXT,
ADD COLUMN     "scheduledBackupId" TEXT,
ADD COLUMN     "secondaryPath" TEXT,
ADD COLUMN     "storageLocation" "StorageLocation" NOT NULL DEFAULT 'PRIMARY',
ADD COLUMN     "tertiaryPath" TEXT,
ADD COLUMN     "verificationMethod" TEXT;

-- CreateTable
CREATE TABLE "disaster_recovery_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemType" "SystemType" NOT NULL,
    "rto" INTEGER NOT NULL,
    "rpo" INTEGER NOT NULL,
    "procedures" JSONB NOT NULL,
    "prerequisites" JSONB,
    "backupIds" TEXT[],
    "recoveryTeam" JSONB,
    "contactList" JSONB,
    "vendorContacts" JSONB,
    "regulatoryProcedures" JSONB,
    "lastTested" TIMESTAMP(3),
    "nextTestDate" TIMESTAMP(3),
    "testResults" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disaster_recovery_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_executions" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "RecoveryStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL,
    "success" BOOLEAN,
    "errorMessage" TEXT,
    "executionLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BackupLogToDisasterRecoveryPlan" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BackupLogToDisasterRecoveryPlan_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "disaster_recovery_plans_systemType_idx" ON "disaster_recovery_plans"("systemType");

-- CreateIndex
CREATE INDEX "disaster_recovery_plans_enabled_idx" ON "disaster_recovery_plans"("enabled");

-- CreateIndex
CREATE INDEX "disaster_recovery_plans_nextTestDate_idx" ON "disaster_recovery_plans"("nextTestDate");

-- CreateIndex
CREATE INDEX "recovery_executions_planId_idx" ON "recovery_executions"("planId");

-- CreateIndex
CREATE INDEX "recovery_executions_status_idx" ON "recovery_executions"("status");

-- CreateIndex
CREATE INDEX "recovery_executions_startedAt_idx" ON "recovery_executions"("startedAt");

-- CreateIndex
CREATE INDEX "_BackupLogToDisasterRecoveryPlan_B_index" ON "_BackupLogToDisasterRecoveryPlan"("B");

-- CreateIndex
CREATE INDEX "backup_logs_storageLocation_idx" ON "backup_logs"("storageLocation");

-- CreateIndex
CREATE INDEX "backup_logs_verified_idx" ON "backup_logs"("verified");

-- CreateIndex
CREATE INDEX "backup_logs_restorationTested_idx" ON "backup_logs"("restorationTested");

-- AddForeignKey
ALTER TABLE "recovery_executions" ADD CONSTRAINT "recovery_executions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "disaster_recovery_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BackupLogToDisasterRecoveryPlan" ADD CONSTRAINT "_BackupLogToDisasterRecoveryPlan_A_fkey" FOREIGN KEY ("A") REFERENCES "backup_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BackupLogToDisasterRecoveryPlan" ADD CONSTRAINT "_BackupLogToDisasterRecoveryPlan_B_fkey" FOREIGN KEY ("B") REFERENCES "disaster_recovery_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
