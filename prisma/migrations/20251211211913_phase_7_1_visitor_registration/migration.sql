-- CreateEnum
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ESCALATED', 'EXPIRED');

-- AlterTable
ALTER TABLE "visitors" ADD COLUMN     "approvalEscalatedAt" TIMESTAMP(3),
ADD COLUMN     "approvalRequestedAt" TIMESTAMP(3),
ADD COLUMN     "badgeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "badgeNumber" TEXT,
ADD COLUMN     "badgePrintedAt" TIMESTAMP(3),
ADD COLUMN     "checkedInBy" TEXT,
ADD COLUMN     "checkedOutBy" TEXT,
ADD COLUMN     "escalationReason" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "groupSize" INTEGER,
ADD COLUMN     "hostNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "idDocumentEncrypted" TEXT,
ADD COLUMN     "idVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "isGroupVisit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qrCode" TEXT,
ADD COLUMN     "qrCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "requiresSecurityClearance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retentionPeriodDays" INTEGER,
ADD COLUMN     "retentionPeriodStart" TIMESTAMP(3),
ADD COLUMN     "securityClearanceChecked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "visitor_approval_requests" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT,
    "hostId" TEXT NOT NULL,
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "escalatedTo" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "escalationReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "requiresSecurityClearance" BOOLEAN NOT NULL DEFAULT false,
    "securityClearanceChecked" BOOLEAN NOT NULL DEFAULT false,
    "securityClearanceResult" TEXT,
    "hostNotifiedAt" TIMESTAMP(3),
    "escalationNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitor_approval_requests_visitorId_idx" ON "visitor_approval_requests"("visitorId");

-- CreateIndex
CREATE INDEX "visitor_approval_requests_hostId_idx" ON "visitor_approval_requests"("hostId");

-- CreateIndex
CREATE INDEX "visitor_approval_requests_status_idx" ON "visitor_approval_requests"("status");

-- CreateIndex
CREATE INDEX "visitor_approval_requests_requestedAt_idx" ON "visitor_approval_requests"("requestedAt");

-- CreateIndex
CREATE INDEX "visitor_approval_requests_escalatedTo_idx" ON "visitor_approval_requests"("escalatedTo");

-- CreateIndex
CREATE INDEX "visitors_qrCode_idx" ON "visitors"("qrCode");

-- CreateIndex
CREATE INDEX "visitors_groupId_idx" ON "visitors"("groupId");

-- CreateIndex
CREATE INDEX "visitors_approvalRequestedAt_idx" ON "visitors"("approvalRequestedAt");

-- AddForeignKey
ALTER TABLE "visitor_approval_requests" ADD CONSTRAINT "visitor_approval_requests_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_approval_requests" ADD CONSTRAINT "visitor_approval_requests_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
