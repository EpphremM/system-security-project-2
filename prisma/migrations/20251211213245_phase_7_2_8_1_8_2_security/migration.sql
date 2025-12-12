-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "zone" TEXT NOT NULL,
    "securityLevel" "SecurityLevel" NOT NULL DEFAULT 'INTERNAL',
    "requiresEscort" BOOLEAN NOT NULL DEFAULT false,
    "requiresClearance" BOOLEAN NOT NULL DEFAULT false,
    "minClearance" "SecurityLevel",
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_area_access" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,
    "requiresEscort" BOOLEAN NOT NULL DEFAULT false,
    "escortId" TEXT,
    "escorted" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_area_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_digital_access" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "wifiUsername" TEXT,
    "wifiPassword" TEXT,
    "wifiSSID" TEXT,
    "wifiExpiresAt" TIMESTAMP(3),
    "networkAccessEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedIPs" TEXT[],
    "blockedIPs" TEXT[],
    "allowedPorts" INTEGER[],
    "blockedPorts" INTEGER[],
    "bandwidthLimit" INTEGER,
    "webPortalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "webPortalUrl" TEXT,
    "webPortalToken" TEXT,
    "printingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "printQuota" INTEGER,
    "printUsed" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_digital_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "areas_name_key" ON "areas"("name");

-- CreateIndex
CREATE INDEX "areas_zone_idx" ON "areas"("zone");

-- CreateIndex
CREATE INDEX "areas_securityLevel_idx" ON "areas"("securityLevel");

-- CreateIndex
CREATE INDEX "areas_enabled_idx" ON "areas"("enabled");

-- CreateIndex
CREATE INDEX "visitor_area_access_visitorId_idx" ON "visitor_area_access"("visitorId");

-- CreateIndex
CREATE INDEX "visitor_area_access_areaId_idx" ON "visitor_area_access"("areaId");

-- CreateIndex
CREATE INDEX "visitor_area_access_expiresAt_idx" ON "visitor_area_access"("expiresAt");

-- CreateIndex
CREATE INDEX "visitor_area_access_active_idx" ON "visitor_area_access"("active");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_digital_access_visitorId_key" ON "visitor_digital_access"("visitorId");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_digital_access_wifiUsername_key" ON "visitor_digital_access"("wifiUsername");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_digital_access_webPortalToken_key" ON "visitor_digital_access"("webPortalToken");

-- CreateIndex
CREATE INDEX "visitor_digital_access_visitorId_idx" ON "visitor_digital_access"("visitorId");

-- CreateIndex
CREATE INDEX "visitor_digital_access_wifiUsername_idx" ON "visitor_digital_access"("wifiUsername");

-- CreateIndex
CREATE INDEX "visitor_digital_access_webPortalToken_idx" ON "visitor_digital_access"("webPortalToken");

-- CreateIndex
CREATE INDEX "visitor_digital_access_expiresAt_idx" ON "visitor_digital_access"("expiresAt");

-- CreateIndex
CREATE INDEX "visitor_digital_access_active_idx" ON "visitor_digital_access"("active");

-- AddForeignKey
ALTER TABLE "visitor_area_access" ADD CONSTRAINT "visitor_area_access_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_area_access" ADD CONSTRAINT "visitor_area_access_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_digital_access" ADD CONSTRAINT "visitor_digital_access_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
