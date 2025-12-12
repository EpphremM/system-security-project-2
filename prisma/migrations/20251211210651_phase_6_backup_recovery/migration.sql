/*
  Warnings:

  - You are about to drop the `_BackupLogToDisasterRecoveryPlan` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_BackupLogToDisasterRecoveryPlan" DROP CONSTRAINT "_BackupLogToDisasterRecoveryPlan_A_fkey";

-- DropForeignKey
ALTER TABLE "_BackupLogToDisasterRecoveryPlan" DROP CONSTRAINT "_BackupLogToDisasterRecoveryPlan_B_fkey";

-- AlterTable
ALTER TABLE "backup_logs" ADD COLUMN     "recoveryPlanId" TEXT;

-- DropTable
DROP TABLE "_BackupLogToDisasterRecoveryPlan";

-- AddForeignKey
ALTER TABLE "backup_logs" ADD CONSTRAINT "backup_logs_recoveryPlanId_fkey" FOREIGN KEY ("recoveryPlanId") REFERENCES "disaster_recovery_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
