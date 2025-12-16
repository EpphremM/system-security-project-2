import { performFullBackup, performIncrementalBackup, performTransactionLogBackup } from "./automated";


export async function scheduleBackup(backupType: string): Promise<void> {
  switch (backupType) {
    case "FULL":
      
      await performFullBackup();
      break;

    case "INCREMENTAL":
      
      await performIncrementalBackup();
      break;

    case "TRANSACTION_LOG":
      
      await performTransactionLogBackup();
      break;

    default:
      throw new Error(`Unknown backup type: ${backupType}`);
  }
}

/**
 * Check if backup should run based on schedule
 */
export function shouldRunBackup(backupType: string, lastBackup?: Date): boolean {
  const now = new Date();

  switch (backupType) {
    case "FULL":
      // Weekly on Sunday at 2:00 AM
      if (now.getDay() === 0 && now.getHours() === 2) {
        if (!lastBackup || (now.getTime() - lastBackup.getTime()) > 6 * 24 * 60 * 60 * 1000) {
          return true;
        }
      }
      return false;

    case "INCREMENTAL":
      // Daily at 2:00 AM
      if (now.getHours() === 2) {
        if (!lastBackup || (now.getTime() - lastBackup.getTime()) > 23 * 60 * 60 * 1000) {
          return true;
        }
      }
      return false;

    case "TRANSACTION_LOG":
      // Every 4 hours
      if (!lastBackup || (now.getTime() - lastBackup.getTime()) > 4 * 60 * 60 * 1000) {
        return true;
      }
      return false;

    default:
      return false;
  }
}



