import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/utils/email";
import {
  AlertType,
  AlertSeverity,
  AlertCategory,
  AlertChannel,
  AlertStatus,
} from "@/generated/prisma/enums";


export async function sendImmediateAlert(
  alertType: AlertType,
  severity: AlertSeverity,
  title: string,
  message: string,
  recipients: string[],
  channels: AlertChannel[],
  metadata?: Record<string, any>
): Promise<string> {
  
  const alert = await prisma.alert.create({
    data: {
      alertType,
      severity,
      title,
      message,
      category: getCategoryForAlertType(alertType),
      recipients,
      channels,
      metadata,
      status: "PENDING",
    },
  });

  
  for (const channel of channels) {
    try {
      if (channel === "EMAIL") {
        await sendEmailAlert(alert.id, recipients, title, message, severity);
      } else if (channel === "SMS") {
        await sendSMSAlert(alert.id, recipients, message, severity);
      }
    } catch (error) {
      console.error(`Failed to send alert via ${channel}:`, error);
    }
  }

  // Update alert status
  await prisma.alert.update({
    where: { id: alert.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });

  return alert.id;
}

/**
 * Alert: Multiple failed login attempts
 */
export async function alertMultipleFailedLogins(
  email: string,
  attemptCount: number,
  ipAddress?: string
): Promise<void> {
  const recipients = [email, process.env.ADMIN_EMAIL || ""].filter(Boolean);
  
  await sendImmediateAlert(
    "MULTIPLE_FAILED_LOGINS",
    attemptCount >= 10 ? "CRITICAL" : "HIGH",
    "Multiple Failed Login Attempts",
    `Multiple failed login attempts detected for account ${email}.\n\nAttempts: ${attemptCount}\nIP Address: ${ipAddress || "Unknown"}\nTime: ${new Date().toISOString()}\n\nPlease review and take appropriate action.`,
    recipients,
    ["EMAIL", "SMS"],
    {
      email,
      attemptCount,
      ipAddress,
    }
  );
}

/**
 * Alert: Unauthorized access attempt
 */
export async function alertUnauthorizedAccess(
  userId: string,
  resource: string,
  resourceId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  const recipients = [
    user?.email || "",
    process.env.SECURITY_TEAM_EMAIL || "",
    process.env.ADMIN_EMAIL || "",
  ].filter(Boolean);

  await sendImmediateAlert(
    "UNAUTHORIZED_ACCESS",
    "CRITICAL",
    "Unauthorized Access Attempt",
    `Unauthorized access attempt detected.\n\nUser: ${user?.email || userId}\nResource: ${resource}\nResource ID: ${resourceId}\nReason: ${reason}\nIP Address: ${ipAddress || "Unknown"}\nTime: ${new Date().toISOString()}\n\nImmediate action required.`,
    recipients,
    ["EMAIL", "SMS"],
    {
      userId,
      resource,
      resourceId,
      reason,
      ipAddress,
    }
  );
}

/**
 * Alert: Critical system error
 */
export async function alertCriticalSystemError(
  error: Error,
  context?: Record<string, any>
): Promise<void> {
  const recipients = [
    process.env.SYSTEM_ADMIN_EMAIL || "",
    process.env.ADMIN_EMAIL || "",
  ].filter(Boolean);

  await sendImmediateAlert(
    "CRITICAL_SYSTEM_ERROR",
    "CRITICAL",
    "Critical System Error",
    `A critical system error has occurred.\n\nError: ${error.message}\nStack: ${error.stack}\nContext: ${JSON.stringify(context, null, 2)}\nTime: ${new Date().toISOString()}\n\nImmediate investigation required.`,
    recipients,
    ["EMAIL", "SMS"],
    {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
    }
  );
}

/**
 * Alert: Backup failure
 */
export async function alertBackupFailure(
  backupId: string,
  errorMessage: string,
  backupType?: string
): Promise<void> {
  const recipients = [
    process.env.BACKUP_ADMIN_EMAIL || "",
    process.env.ADMIN_EMAIL || "",
  ].filter(Boolean);

  await sendImmediateAlert(
    "BACKUP_FAILURE",
    "HIGH",
    "Backup Failure",
    `A backup operation has failed.\n\nBackup ID: ${backupId}\nBackup Type: ${backupType || "Unknown"}\nError: ${errorMessage}\nTime: ${new Date().toISOString()}\n\nPlease investigate and retry the backup.`,
    recipients,
    ["EMAIL"],
    {
      backupId,
      backupType,
      errorMessage,
    }
  );
}

/**
 * Send email alert
 */
async function sendEmailAlert(
  alertId: string,
  recipients: string[],
  title: string,
  message: string,
  severity: AlertSeverity
): Promise<void> {
  const severityColor = {
    LOW: "#3b82f6",
    MEDIUM: "#f59e0b",
    HIGH: "#ef4444",
    CRITICAL: "#dc2626",
  }[severity];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .alert-box { border-left: 4px solid ${severityColor}; padding: 20px; background: #f9fafb; margin: 20px 0; }
        .severity { display: inline-block; padding: 4px 12px; border-radius: 4px; background: ${severityColor}; color: white; font-weight: bold; }
        .message { white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <h1>Security Alert</h1>
      <div class="alert-box">
        <div><span class="severity">${severity}</span></div>
        <h2>${title}</h2>
        <div class="message">${message}</div>
      </div>
      <p><small>Alert ID: ${alertId}</small></p>
    </body>
    </html>
  `;

  for (const recipient of recipients) {
    await sendEmail(recipient, `[${severity}] ${title}`, html);
  }
}

/**
 * Send SMS alert (placeholder - integrate with SMS provider)
 */
async function sendSMSAlert(
  alertId: string,
  recipients: string[],
  message: string,
  severity: AlertSeverity
): Promise<void> {
  // In production, integrate with SMS provider (Twilio, AWS SNS, etc.)
  // For now, log the SMS alert
  console.log(`SMS Alert [${severity}]: ${message}`, {
    alertId,
    recipients,
  });

  // Example Twilio integration:
  // const twilio = require('twilio');
  // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  // for (const recipient of recipients) {
  //   await client.messages.create({
  //     body: `[${severity}] ${message}`,
  //     from: process.env.TWILIO_PHONE_NUMBER,
  //     to: recipient
  //   });
  // }
}

/**
 * Get category for alert type
 */
function getCategoryForAlertType(alertType: AlertType): AlertCategory {
  switch (alertType) {
    case "MULTIPLE_FAILED_LOGINS":
    case "UNAUTHORIZED_ACCESS":
      return "SECURITY";
    case "CRITICAL_SYSTEM_ERROR":
    case "BACKUP_FAILURE":
      return "SYSTEM";
    case "COMPLIANCE_GAP":
      return "COMPLIANCE";
    case "PERFORMANCE_DEGRADATION":
      return "PERFORMANCE";
    default:
      return "SECURITY";
  }
}



