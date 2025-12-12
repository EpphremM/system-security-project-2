-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "resource_permissions" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT,
    "canRead" BOOLEAN NOT NULL DEFAULT false,
    "canWrite" BOOLEAN NOT NULL DEFAULT false,
    "canExecute" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "canShare" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "inherited" BOOLEAN NOT NULL DEFAULT false,
    "inheritedFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ownership_transfers" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "rejectionReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ownership_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sharing_links" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canWrite" BOOLEAN NOT NULL DEFAULT false,
    "canExecute" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "canShare" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "password" TEXT,
    "requireAuth" BOOLEAN NOT NULL DEFAULT false,
    "allowedEmails" TEXT[],
    "allowedDomains" TEXT[],
    "name" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "sharing_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_permissions_resourceId_idx" ON "resource_permissions"("resourceId");

-- CreateIndex
CREATE INDEX "resource_permissions_userId_idx" ON "resource_permissions"("userId");

-- CreateIndex
CREATE INDEX "resource_permissions_groupId_idx" ON "resource_permissions"("groupId");

-- CreateIndex
CREATE INDEX "resource_permissions_expiresAt_idx" ON "resource_permissions"("expiresAt");

-- CreateIndex
CREATE INDEX "ownership_transfers_resourceId_idx" ON "ownership_transfers"("resourceId");

-- CreateIndex
CREATE INDEX "ownership_transfers_fromUserId_idx" ON "ownership_transfers"("fromUserId");

-- CreateIndex
CREATE INDEX "ownership_transfers_toUserId_idx" ON "ownership_transfers"("toUserId");

-- CreateIndex
CREATE INDEX "ownership_transfers_status_idx" ON "ownership_transfers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sharing_links_token_key" ON "sharing_links"("token");

-- CreateIndex
CREATE INDEX "sharing_links_resourceId_idx" ON "sharing_links"("resourceId");

-- CreateIndex
CREATE INDEX "sharing_links_token_idx" ON "sharing_links"("token");

-- CreateIndex
CREATE INDEX "sharing_links_createdBy_idx" ON "sharing_links"("createdBy");

-- CreateIndex
CREATE INDEX "sharing_links_expiresAt_idx" ON "sharing_links"("expiresAt");

-- CreateIndex
CREATE INDEX "resources_parentId_idx" ON "resources"("parentId");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_permissions" ADD CONSTRAINT "resource_permissions_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_permissions" ADD CONSTRAINT "resource_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_transfers" ADD CONSTRAINT "ownership_transfers_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharing_links" ADD CONSTRAINT "sharing_links_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharing_links" ADD CONSTRAINT "sharing_links_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
