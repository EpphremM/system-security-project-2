-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('JSON', 'CSV', 'PDF', 'EXCEL', 'HTML');

-- CreateEnum
CREATE TYPE "ReportGenerationStatus" AS ENUM ('GENERATING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ON_DEMAND');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportType" ADD VALUE 'ACCESS_CONTROL_REVIEW';
ALTER TYPE "ReportType" ADD VALUE 'USER_PERMISSION';
ALTER TYPE "ReportType" ADD VALUE 'DATA_ACCESS_AUDIT';
ALTER TYPE "ReportType" ADD VALUE 'POLICY_COMPLIANCE';
ALTER TYPE "ReportType" ADD VALUE 'THREAT_INTELLIGENCE';
ALTER TYPE "ReportType" ADD VALUE 'VULNERABILITY_ASSESSMENT';
ALTER TYPE "ReportType" ADD VALUE 'SECURITY_INCIDENT';
ALTER TYPE "ReportType" ADD VALUE 'RISK_ASSESSMENT';
ALTER TYPE "ReportType" ADD VALUE 'VISITOR_STATISTICS';
ALTER TYPE "ReportType" ADD VALUE 'SYSTEM_PERFORMANCE';
ALTER TYPE "ReportType" ADD VALUE 'BACKUP_SUCCESS';
ALTER TYPE "ReportType" ADD VALUE 'USER_ACTIVITY';

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "reportName" TEXT NOT NULL,
    "description" TEXT,
    "reportData" JSONB NOT NULL,
    "filters" JSONB,
    "format" "ReportFormat" NOT NULL DEFAULT 'JSON',
    "fileUrl" TEXT,
    "fileSize" BIGINT,
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "ReportGenerationStatus" NOT NULL DEFAULT 'GENERATING',
    "errorMessage" TEXT,
    "scheduleId" TEXT,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reportType" "ReportType" NOT NULL,
    "templateConfig" JSONB NOT NULL,
    "defaultFilters" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reportType" "ReportType" NOT NULL,
    "templateId" TEXT,
    "frequency" "ScheduleFrequency" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "time" TEXT,
    "recipients" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_reportType_idx" ON "reports"("reportType");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_generatedBy_idx" ON "reports"("generatedBy");

-- CreateIndex
CREATE INDEX "reports_generatedAt_idx" ON "reports"("generatedAt");

-- CreateIndex
CREATE INDEX "reports_scheduleId_idx" ON "reports"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "report_templates_name_key" ON "report_templates"("name");

-- CreateIndex
CREATE INDEX "report_templates_reportType_idx" ON "report_templates"("reportType");

-- CreateIndex
CREATE INDEX "report_templates_enabled_idx" ON "report_templates"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "report_schedules_name_key" ON "report_schedules"("name");

-- CreateIndex
CREATE INDEX "report_schedules_reportType_idx" ON "report_schedules"("reportType");

-- CreateIndex
CREATE INDEX "report_schedules_enabled_idx" ON "report_schedules"("enabled");

-- CreateIndex
CREATE INDEX "report_schedules_nextRunAt_idx" ON "report_schedules"("nextRunAt");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "report_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "report_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "report_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
