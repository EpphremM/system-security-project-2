-- CreateEnum
CREATE TYPE "ClearanceStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClearanceChangeType" AS ENUM ('ASSIGNED', 'UPGRADED', 'DOWNGRADED', 'REVOKED', 'COMPARTMENT_ADDED', 'COMPARTMENT_REMOVED', 'REVIEWED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "CompartmentType" AS ENUM ('FINANCIAL', 'PERSONNEL', 'OPERATIONAL', 'VISITOR', 'IT', 'LEGAL', 'EXECUTIVE', 'CUSTOM');

-- AlterTable
ALTER TABLE "security_labels" ADD COLUMN     "compartments" TEXT[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "trustedSubject" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "user_clearances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "SecurityLevel" NOT NULL,
    "compartments" TEXT[],
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "status" "ClearanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "escalationRequested" BOOLEAN NOT NULL DEFAULT false,
    "escalationReason" TEXT,
    "escalationRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_clearances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "previousLevel" "SecurityLevel",
    "newLevel" "SecurityLevel" NOT NULL,
    "previousCompartments" TEXT[],
    "newCompartments" TEXT[],
    "changedBy" TEXT,
    "reason" TEXT,
    "changeType" "ClearanceChangeType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clearance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_compartments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CompartmentType" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clearance_compartments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClearanceUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClearanceUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_clearances_userId_key" ON "user_clearances"("userId");

-- CreateIndex
CREATE INDEX "user_clearances_userId_idx" ON "user_clearances"("userId");

-- CreateIndex
CREATE INDEX "user_clearances_level_idx" ON "user_clearances"("level");

-- CreateIndex
CREATE INDEX "user_clearances_status_idx" ON "user_clearances"("status");

-- CreateIndex
CREATE INDEX "user_clearances_nextReviewAt_idx" ON "user_clearances"("nextReviewAt");

-- CreateIndex
CREATE INDEX "clearance_history_userId_idx" ON "clearance_history"("userId");

-- CreateIndex
CREATE INDEX "clearance_history_createdAt_idx" ON "clearance_history"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_compartments_name_key" ON "clearance_compartments"("name");

-- CreateIndex
CREATE INDEX "clearance_compartments_type_idx" ON "clearance_compartments"("type");

-- CreateIndex
CREATE INDEX "clearance_compartments_enabled_idx" ON "clearance_compartments"("enabled");

-- CreateIndex
CREATE INDEX "_ClearanceUser_B_index" ON "_ClearanceUser"("B");

-- AddForeignKey
ALTER TABLE "user_clearances" ADD CONSTRAINT "user_clearances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_history" ADD CONSTRAINT "clearance_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClearanceUser" ADD CONSTRAINT "_ClearanceUser_A_fkey" FOREIGN KEY ("A") REFERENCES "clearance_compartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClearanceUser" ADD CONSTRAINT "_ClearanceUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
