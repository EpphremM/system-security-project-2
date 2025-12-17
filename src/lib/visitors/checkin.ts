import { prisma } from "@/lib/prisma";
import { VisitStatus } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/utils/email";
import { logVisitorAction } from "@/lib/utils/logger";
import { createHash } from "crypto";
import QRCode from "qrcode";


export async function checkInVisitor(
  visitorId: string,
  checkedInBy: string,
  options?: {
    qrCode?: string;
    idVerified?: boolean;
  }
): Promise<{
  success: boolean;
  badgeNumber: string;
  qrCodeUrl: string;
  expiresAt: Date;
}> {
  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
    include: { host: true },
  });

  if (!visitor) {
    throw new Error("Visitor not found");
  }

  if (visitor.status !== "APPROVED") {
    throw new Error("Visitor must be approved before check-in");
  }

  
  if (options?.qrCode && visitor.qrCode) {
    const isValid = verifyQRCode(visitor.qrCode, options.qrCode);
    if (!isValid) {
      throw new Error("Invalid QR code");
    }
  }

  
  if (visitor.qrCodeExpiresAt && visitor.qrCodeExpiresAt < new Date()) {
    throw new Error("QR code has expired");
  }

  
  const badgeExpiresAt = new Date();
  badgeExpiresAt.setHours(badgeExpiresAt.getHours() + 8);
  if (visitor.scheduledEnd > badgeExpiresAt) {
    badgeExpiresAt.setTime(visitor.scheduledEnd.getTime() + 2 * 60 * 60 * 1000);
  }

  
  await prisma.visitor.update({
    where: { id: visitorId },
    data: {
      status: "CHECKED_IN",
      actualCheckIn: new Date(),
      checkedInBy,
      idVerifiedAt: options?.idVerified ? new Date() : null,
      badgeExpiresAt,
      badgePrintedAt: new Date(),
    },
  });

  
  const qrCodeUrl = await generateQRCodeImage(visitor.qrCode || visitor.id);

  
  await notifyHostOfArrival(visitor);

  
  await logVisitorAction(visitorId, "CHECKED_IN", checkedInBy, "Visitor checked in");

  return {
    success: true,
    badgeNumber: visitor.badgeNumber || `BADGE-${visitorId.substring(0, 8)}`,
    qrCodeUrl,
    expiresAt: badgeExpiresAt,
  };
}


export async function checkOutVisitor(
  visitorId: string,
  checkedOutBy: string,
  options?: {
    badgeReturned?: boolean;
    notes?: string;
  }
): Promise<{
  success: boolean;
  reportGenerated: boolean;
}> {
  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
  });

  if (!visitor) {
    throw new Error("Visitor not found");
  }

  if (visitor.status !== "CHECKED_IN") {
    throw new Error("Visitor must be checked in before check-out");
  }

  

  const retentionPeriodStart = new Date();
  const retentionPeriodDays = 2555; 


  

  await prisma.visitor.update({
    where: { id: visitorId },
    data: {
      status: "CHECKED_OUT",
      actualCheckOut: new Date(),
      checkedOutBy,
      retentionPeriodStart,
      retentionPeriodDays,
    },
  });

  

  const reportGenerated = await generateVisitReport(visitorId);

  

  await logVisitorAction(
    visitorId,
    "CHECKED_OUT",
    checkedOutBy,
    options?.notes || "Visitor checked out"
  );

  return {
    success: true,
    reportGenerated,
  };
}


export async function automaticCheckOut(): Promise<{
  checkedOut: number;
  visitorIds: string[];
}> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  

  const visitors = await prisma.visitor.findMany({
    where: {
      status: "CHECKED_IN",
      scheduledEnd: {
        lte: oneHourAgo, 

      },
    },
  });

  const checkedOut: string[] = [];

  for (const visitor of visitors) {
    try {
      await checkOutVisitor(visitor.id, "SYSTEM", {
        badgeReturned: false,
        notes: "Automatic check-out after scheduled end time",
      });
      checkedOut.push(visitor.id);
    } catch (error) {
      console.error(`Failed to auto-checkout visitor ${visitor.id}:`, error);
    }
  }

  return {
    checkedOut: checkedOut.length,
    visitorIds: checkedOut,
  };
}


function verifyQRCode(storedHash: string, providedCode: string): boolean {
  const providedHash = createHash("sha256").update(providedCode).digest("hex");
  return providedHash === storedHash;
}


async function generateQRCodeImage(data: string): Promise<string> {
  const qrData = JSON.stringify({
    visitorId: data,
    timestamp: Date.now(),
  });
  return await QRCode.toDataURL(qrData);
}


async function notifyHostOfArrival(visitor: any): Promise<void> {
  if (!visitor.host || !visitor.host.email) {
    return;
  }

  await sendEmail(
    visitor.host.email,
    "Visitor Has Arrived",
    `
      <h1>Visitor Has Arrived</h1>
      <p>Your visitor has checked in:</p>
      <ul>
        <li><strong>Name:</strong> ${visitor.firstName} ${visitor.lastName}</li>
        <li><strong>Company:</strong> ${visitor.company}</li>
        <li><strong>Purpose:</strong> ${visitor.purpose}</li>
        <li><strong>Checked in at:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      <p>Please meet them at reception.</p>
    `
  );

  await prisma.visitor.update({
    where: { id: visitor.id },
    data: { hostNotifiedAt: new Date() },
  });
}


async function generateVisitReport(visitorId: string): Promise<boolean> {
  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
    include: {
      host: true,
      visitorLogs: {
        orderBy: { createdAt: "asc" },
      },
      accessLogs: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!visitor) {
    return false;
  }

  const report = {
    visitorId: visitor.id,
    visitorName: `${visitor.firstName} ${visitor.lastName}`,
    company: visitor.company,
    purpose: visitor.purpose,
    host: visitor.host ? `${visitor.host.name} (${visitor.host.email})` : "Unknown",
    scheduledStart: visitor.scheduledStart,
    scheduledEnd: visitor.scheduledEnd,
    actualCheckIn: visitor.actualCheckIn,
    actualCheckOut: visitor.actualCheckOut,
    duration: visitor.actualCheckIn && visitor.actualCheckOut
      ? Math.round((visitor.actualCheckOut.getTime() - visitor.actualCheckIn.getTime()) / 1000 / 60) 

      : null,
    activities: visitor.visitorLogs.map((log) => ({
      action: log.action,
      timestamp: log.createdAt,
      description: log.description,
    })),
    accessLogs: visitor.accessLogs.map((log) => ({
      action: log.action,
      location: log.location,
      timestamp: log.createdAt,
    })),
    retentionPeriod: {
      start: visitor.retentionPeriodStart,
      days: visitor.retentionPeriodDays,
    },
    generatedAt: new Date().toISOString(),
  };

  

  

  await logVisitorAction(
    visitorId,
    "VISIT_REPORT_GENERATED",
    undefined,
    JSON.stringify(report)
  );

  return true;
}


export async function getVisitorQRCode(visitorId: string): Promise<string> {
  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
  });

  if (!visitor) {
    throw new Error("Visitor not found");
  }

  if (!visitor.qrCode) {
    throw new Error("QR code not generated for this visitor");
  }

  return await generateQRCodeImage(visitor.qrCode);
}



