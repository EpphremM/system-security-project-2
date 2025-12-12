-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('SECURITY_BREACH', 'DATA_LEAK', 'UNAUTHORIZED_ACCESS', 'MALWARE', 'DDoS', 'PHISHING', 'INSIDER_THREAT', 'POLICY_VIOLATION', 'SYSTEM_COMPROMISE', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ThreatType" AS ENUM ('MALICIOUS_IP', 'SUSPICIOUS_ACTIVITY', 'BRUTE_FORCE', 'SQL_INJECTION', 'XSS_ATTACK', 'DDoS', 'MALWARE', 'PHISHING', 'UNAUTHORIZED_ACCESS', 'DATA_EXFILTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ThreatSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ThreatStatus" AS ENUM ('ACTIVE', 'INVESTIGATING', 'MITIGATED', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateTable
CREATE TABLE "security_incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "category" "IncidentCategory" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedBy" TEXT,
    "assignedTo" TEXT,
    "playbookId" TEXT,
    "responseSteps" JSONB,
    "communicationLog" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "lessonsLearned" TEXT,
    "relatedLogIds" TEXT[],
    "relatedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_playbooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "IncidentCategory" NOT NULL,
    "steps" JSONB NOT NULL,
    "templates" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_health" (
    "id" TEXT NOT NULL,
    "status" "HealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "cpuUsage" DOUBLE PRECISION,
    "memoryUsage" DOUBLE PRECISION,
    "diskUsage" DOUBLE PRECISION,
    "networkLatency" INTEGER,
    "databaseStatus" TEXT,
    "apiStatus" TEXT,
    "backupStatus" TEXT,
    "activeThreats" INTEGER NOT NULL DEFAULT 0,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "activeSessions" INTEGER NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threat_intelligence" (
    "id" TEXT NOT NULL,
    "threatType" "ThreatType" NOT NULL,
    "severity" "ThreatSeverity" NOT NULL,
    "source" TEXT,
    "description" TEXT NOT NULL,
    "ipAddress" TEXT,
    "country" TEXT,
    "region" TEXT,
    "status" "ThreatStatus" NOT NULL DEFAULT 'ACTIVE',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threat_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_incidents_severity_idx" ON "security_incidents"("severity");

-- CreateIndex
CREATE INDEX "security_incidents_category_idx" ON "security_incidents"("category");

-- CreateIndex
CREATE INDEX "security_incidents_status_idx" ON "security_incidents"("status");

-- CreateIndex
CREATE INDEX "security_incidents_detectedAt_idx" ON "security_incidents"("detectedAt");

-- CreateIndex
CREATE INDEX "security_incidents_assignedTo_idx" ON "security_incidents"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "incident_playbooks_name_key" ON "incident_playbooks"("name");

-- CreateIndex
CREATE INDEX "incident_playbooks_category_idx" ON "incident_playbooks"("category");

-- CreateIndex
CREATE INDEX "incident_playbooks_enabled_idx" ON "incident_playbooks"("enabled");

-- CreateIndex
CREATE INDEX "system_health_status_idx" ON "system_health"("status");

-- CreateIndex
CREATE INDEX "system_health_recordedAt_idx" ON "system_health"("recordedAt");

-- CreateIndex
CREATE INDEX "threat_intelligence_threatType_idx" ON "threat_intelligence"("threatType");

-- CreateIndex
CREATE INDEX "threat_intelligence_severity_idx" ON "threat_intelligence"("severity");

-- CreateIndex
CREATE INDEX "threat_intelligence_status_idx" ON "threat_intelligence"("status");

-- CreateIndex
CREATE INDEX "threat_intelligence_detectedAt_idx" ON "threat_intelligence"("detectedAt");

-- CreateIndex
CREATE INDEX "threat_intelligence_ipAddress_idx" ON "threat_intelligence"("ipAddress");
