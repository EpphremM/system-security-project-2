/*
  Warnings:

  - Added the required column `logType` to the `audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LogCategory" AS ENUM ('SECURITY', 'USER_ACTIVITY', 'SYSTEM', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('AUTH_SUCCESS', 'AUTH_FAILURE', 'AUTH_LOCKOUT', 'MFA_SUCCESS', 'MFA_FAILURE', 'ACCESS_GRANTED', 'ACCESS_DENIED', 'POLICY_VIOLATION', 'SECURITY_CONFIG_CHANGE', 'CLEARANCE_CHANGE', 'PERMISSION_CHANGE', 'DATA_ACCESS', 'DATA_CREATE', 'DATA_UPDATE', 'DATA_DELETE', 'DATA_EXPORT', 'PERMISSION_GRANT', 'PERMISSION_REVOKE', 'ROLE_ASSIGNED', 'ROLE_REVOKED', 'OWNERSHIP_TRANSFER', 'APP_START', 'APP_STOP', 'APP_ERROR', 'BACKUP_START', 'BACKUP_COMPLETE', 'BACKUP_FAILED', 'BACKUP_VERIFIED', 'PERFORMANCE_METRIC', 'EXCEPTION', 'CONFIG_CHANGE', 'SUBJECT_ACCESS_REQUEST', 'DATA_RETENTION_ENFORCED', 'DATA_DELETED_RETENTION', 'AUDIT_EXPORT', 'COMPLIANCE_CHECK', 'GDPR_REQUEST', 'HIPAA_AUDIT');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "accessGranted" BOOLEAN,
ADD COLUMN     "afterState" JSONB,
ADD COLUMN     "beforeState" JSONB,
ADD COLUMN     "category" "LogCategory" NOT NULL DEFAULT 'USER_ACTIVITY',
ADD COLUMN     "denialReason" TEXT,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "exportFormat" TEXT,
ADD COLUMN     "exportedAt" TIMESTAMP(3),
ADD COLUMN     "exportedBy" TEXT,
ADD COLUMN     "logType" "LogType" NOT NULL,
ADD COLUMN     "performanceMetrics" JSONB,
ADD COLUMN     "policyId" TEXT,
ADD COLUMN     "policyType" "PolicyType",
ADD COLUMN     "stackTrace" TEXT,
ADD COLUMN     "subjectRequestId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "audit_logs_category_idx" ON "audit_logs"("category");

-- CreateIndex
CREATE INDEX "audit_logs_logType_idx" ON "audit_logs"("logType");

-- CreateIndex
CREATE INDEX "audit_logs_accessGranted_idx" ON "audit_logs"("accessGranted");

-- CreateIndex
CREATE INDEX "audit_logs_policyType_idx" ON "audit_logs"("policyType");

-- CreateIndex
CREATE INDEX "audit_logs_complianceTags_idx" ON "audit_logs"("complianceTags");

-- CreateIndex
CREATE INDEX "audit_logs_subjectRequestId_idx" ON "audit_logs"("subjectRequestId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
