import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  alertMultipleFailedLogins,
  alertUnauthorizedAccess,
  alertCriticalSystemError,
  alertBackupFailure,
} from "@/lib/alerting/immediate";
import { z } from "zod";

const alertSchema = z.object({
  type: z.enum([
    "MULTIPLE_FAILED_LOGINS",
    "UNAUTHORIZED_ACCESS",
    "CRITICAL_SYSTEM_ERROR",
    "BACKUP_FAILURE",
  ]),
  data: z.any(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = alertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { type, data } = parsed.data;
    let alertId: string;

    switch (type) {
      case "MULTIPLE_FAILED_LOGINS":
        alertId = await alertMultipleFailedLogins(
          data.email,
          data.attemptCount,
          data.ipAddress
        );
        break;

      case "UNAUTHORIZED_ACCESS":
        alertId = await alertUnauthorizedAccess(
          data.userId,
          data.resource,
          data.resourceId,
          data.reason,
          data.ipAddress
        );
        break;

      case "CRITICAL_SYSTEM_ERROR":
        alertId = await alertCriticalSystemError(
          new Error(data.errorMessage),
          data.context
        );
        break;

      case "BACKUP_FAILURE":
        alertId = await alertBackupFailure(
          data.backupId,
          data.errorMessage,
          data.backupType
        );
        break;

      default:
        return NextResponse.json(
          { error: "Unknown alert type" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      alertId,
      message: "Alert sent successfully",
    });
  } catch (error) {
    console.error("Send immediate alert error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send alert" },
      { status: 500 }
    );
  }
}



