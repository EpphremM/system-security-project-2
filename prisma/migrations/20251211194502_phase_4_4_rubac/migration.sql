-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('TIME_BASED', 'LOCATION_BASED', 'DEVICE_BASED', 'COMPOSITE');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('PUBLIC_HOLIDAY', 'COMPANY_HOLIDAY', 'EMERGENCY_CLOSURE', 'MAINTENANCE_WINDOW');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('DESKTOP', 'LAPTOP', 'MOBILE', 'TABLET', 'SERVER', 'IOT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('TRUSTED', 'VERIFIED', 'UNKNOWN', 'UNTRUSTED', 'BLOCKED');

-- AlterTable
ALTER TABLE "access_policies" ADD COLUMN     "ruleId" TEXT;

-- CreateTable
CREATE TABLE "access_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" "RuleType" NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "emergencyOverride" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "holidayScheduleId" TEXT,
    "ipWhitelistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holiday_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "HolidayType" NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holiday_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_whitelists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ipRanges" TEXT[],
    "location" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_whitelists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceType" "DeviceType" NOT NULL,
    "os" TEXT,
    "osVersion" TEXT,
    "browser" TEXT,
    "browserVersion" TEXT,
    "isCompanyManaged" BOOLEAN NOT NULL DEFAULT false,
    "hasAntiMalware" BOOLEAN NOT NULL DEFAULT false,
    "hasEncryptedStorage" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "trustLevel" "TrustLevel" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_rules_ruleType_idx" ON "access_rules"("ruleType");

-- CreateIndex
CREATE INDEX "access_rules_enabled_idx" ON "access_rules"("enabled");

-- CreateIndex
CREATE INDEX "access_rules_priority_idx" ON "access_rules"("priority");

-- CreateIndex
CREATE INDEX "access_rules_validFrom_validUntil_idx" ON "access_rules"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "access_rules_holidayScheduleId_idx" ON "access_rules"("holidayScheduleId");

-- CreateIndex
CREATE INDEX "access_rules_ipWhitelistId_idx" ON "access_rules"("ipWhitelistId");

-- CreateIndex
CREATE INDEX "holiday_schedules_startDate_endDate_idx" ON "holiday_schedules"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "holiday_schedules_type_idx" ON "holiday_schedules"("type");

-- CreateIndex
CREATE INDEX "ip_whitelists_enabled_idx" ON "ip_whitelists"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "device_profiles_deviceId_key" ON "device_profiles"("deviceId");

-- CreateIndex
CREATE INDEX "device_profiles_userId_idx" ON "device_profiles"("userId");

-- CreateIndex
CREATE INDEX "device_profiles_deviceId_idx" ON "device_profiles"("deviceId");

-- CreateIndex
CREATE INDEX "device_profiles_trustLevel_idx" ON "device_profiles"("trustLevel");

-- CreateIndex
CREATE INDEX "device_profiles_isCompanyManaged_idx" ON "device_profiles"("isCompanyManaged");

-- CreateIndex
CREATE INDEX "access_policies_ruleId_idx" ON "access_policies"("ruleId");

-- AddForeignKey
ALTER TABLE "access_policies" ADD CONSTRAINT "access_policies_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "access_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_rules" ADD CONSTRAINT "access_rules_holidayScheduleId_fkey" FOREIGN KEY ("holidayScheduleId") REFERENCES "holiday_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_rules" ADD CONSTRAINT "access_rules_ipWhitelistId_fkey" FOREIGN KEY ("ipWhitelistId") REFERENCES "ip_whitelists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_profiles" ADD CONSTRAINT "device_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
