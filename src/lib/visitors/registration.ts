import { prisma } from "@/lib/prisma";
import { VisitPurpose, VisitStatus, SecurityLevel } from "@/generated/prisma/enums";
import { encryptLogData } from "@/lib/logging/encryption";
import { sendEmail } from "@/lib/utils/email";
import { logVisitorAction } from "@/lib/utils/logger";
import { createHash, randomBytes } from "crypto";
import QRCode from "qrcode";

interface PreRegistrationData {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  company: string;
  purpose: VisitPurpose;
  hostId: string;
  scheduledDate: Date;
  scheduledStart: Date;
  scheduledEnd: Date;
  idDocument?: string; 
  idDocumentType?: string;
  isGroupVisit?: boolean;
  groupSize?: number;
  groupId?: string;
}


export async function preRegisterVisitor(
  data: PreRegistrationData,
  captchaToken?: string
): Promise<{
  visitorId: string;
  status: string;
  message: string;
}> {
  
  if (captchaToken) {
    const captchaValid = await verifyCAPTCHA(captchaToken);
    if (!captchaValid) {
      throw new Error("CAPTCHA verification failed");
    }
  }

  
  let idDocumentEncrypted: string | undefined;
  if (data.idDocument) {
    const encrypted = await encryptLogData(data.idDocument, "USER_ACTIVITY");
    idDocumentEncrypted = JSON.stringify(encrypted);
  }

  
  const visitor = await prisma.visitor.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone,
      company: data.company,
      purpose: data.purpose,
      hostId: data.hostId,
      scheduledDate: data.scheduledDate,
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
      status: "PENDING",
      ...(data.idDocument && {
        documentId: `doc-${Date.now()}`,
        idDocumentEncrypted: idDocumentEncrypted || null,
      }),
      ...(data.isGroupVisit && {
        isGroupVisit: true,
        ...(data.groupId && { groupId: data.groupId }),
        ...(data.groupSize && { groupSize: data.groupSize }),
      }),
      approvalRequestedAt: new Date(),
    },
  });

  

  await createApprovalRequest(visitor.id, data.hostId);

  

  await logVisitorAction(visitor.id, "CREATED", undefined, "Pre-registration completed");

  return {
    visitorId: visitor.id,
    status: "PENDING",
    message: "Visitor pre-registered successfully. Awaiting host approval.",
  };
}


async function createApprovalRequest(visitorId: string, hostId: string): Promise<string> {
  const visitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
    include: { host: true },
  });

  if (!visitor) {
    throw new Error("Visitor not found");
  }

  

  const requiresSecurityClearance = visitor.securityLabel !== "PUBLIC";

  const request = await prisma.visitorApprovalRequest.create({
    data: {
      visitorId,
      hostId,
      requiresSecurityClearance,
      status: "PENDING",
      requestedAt: new Date(),
    },
  });

  

  await notifyHostForApproval(visitor, request.id);

  return request.id;
}


async function notifyHostForApproval(visitor: any, requestId: string): Promise<void> {
  const host = await prisma.user.findUnique({
    where: { id: visitor.hostId },
  });

  if (!host || !host.email) {
    throw new Error("Host not found or has no email");
  }

  const approvalUrl = `${process.env.NEXTAUTH_URL}/visitors/approve/${requestId}`;

  await sendEmail(
    host.email,
    "Visitor Approval Request",
    `
      <h1>Visitor Approval Request</h1>
      <p>You have a new visitor approval request:</p>
      <ul>
        <li><strong>Visitor:</strong> ${visitor.firstName} ${visitor.lastName}</li>
        <li><strong>Company:</strong> ${visitor.company}</li>
        <li><strong>Purpose:</strong> ${visitor.purpose}</li>
        <li><strong>Scheduled:</strong> ${visitor.scheduledDate.toLocaleDateString()} ${visitor.scheduledStart.toLocaleTimeString()}</li>
      </ul>
      <p><a href="${approvalUrl}">Approve or Reject</a></p>
      <p>If you don't respond within 24 hours, this request will be escalated to your department head.</p>
    `
  );

  await prisma.visitorApprovalRequest.update({
    where: { id: requestId },
    data: { hostNotifiedAt: new Date() },
  });
}


export async function approveVisitor(
  requestId: string,
  approvedBy: string,
  options?: {
    checkSecurityClearance?: boolean;
    notes?: string;
  }
): Promise<{
  visitorId: string;
  qrCode: string;
  badgeNumber: string;
}> {
  const request = await prisma.visitorApprovalRequest.findUnique({
    where: { id: requestId },
    include: { visitor: true },
  });

  if (!request) {
    throw new Error("Approval request not found");
  }

  if (request.status !== "PENDING" && request.status !== "ESCALATED") {
    throw new Error("Request is not pending approval");
  }

  

  if (request.requiresSecurityClearance && !request.securityClearanceChecked) {
    if (options?.checkSecurityClearance) {
      

      const clearanceResult = await checkSecurityClearance(request.visitor);
      await prisma.visitorApprovalRequest.update({
        where: { id: requestId },
        data: {
          securityClearanceChecked: true,
          securityClearanceResult: clearanceResult ? "APPROVED" : "DENIED",
        },
      });

      if (!clearanceResult) {
        throw new Error("Security clearance check failed");
      }
    } else {
      throw new Error("Security clearance check required");
    }
  }

  

  const qrCode = await generateQRCode(request.visitor.id);
  const qrCodeExpiresAt = new Date(request.visitor.scheduledEnd);
  qrCodeExpiresAt.setHours(qrCodeExpiresAt.getHours() + 2); 


  

  const badgeNumber = `BADGE-${Date.now()}-${request.visitor.id.substring(0, 8).toUpperCase()}`;

  

  await prisma.visitor.update({
    where: { id: request.visitor.id },
    data: {
      status: "APPROVED",
      approvalDate: new Date(),
      approvedById: approvedBy,
      qrCode,
      qrCodeExpiresAt,
      badgeNumber,
    },
  });

  

  await prisma.visitorApprovalRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy,
    },
  });

  

  await logVisitorAction(request.visitor.id, "APPROVED", approvedBy, options?.notes);

  return {
    visitorId: request.visitor.id,
    qrCode,
    badgeNumber,
  };
}


export async function rejectVisitor(
  requestId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  const request = await prisma.visitorApprovalRequest.findUnique({
    where: { id: requestId },
    include: { visitor: true },
  });

  if (!request) {
    throw new Error("Approval request not found");
  }

  

  await prisma.visitor.update({
    where: { id: request.visitor.id },
    data: {
      status: "REJECTED",
    },
  });

  

  await prisma.visitorApprovalRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectedBy,
      rejectionReason: reason,
    },
  });

  

  await logVisitorAction(request.visitor.id, "REJECTED", rejectedBy, reason);
}


export async function escalateApprovalRequest(
  requestId: string,
  departmentHeadId: string,
  reason?: string
): Promise<void> {
  const request = await prisma.visitorApprovalRequest.findUnique({
    where: { id: requestId },
    include: { visitor: true },
  });

  if (!request) {
    throw new Error("Approval request not found");
  }

  

  const departmentHead = await prisma.user.findUnique({
    where: { id: departmentHeadId },
  });

  if (!departmentHead) {
    throw new Error("Department head not found");
  }

  

  await prisma.visitorApprovalRequest.update({
    where: { id: requestId },
    data: {
      status: "ESCALATED",
      escalatedTo: departmentHeadId,
      escalatedAt: new Date(),
      escalationReason: reason || "No response from host within 24 hours",
    },
  });

  

  await prisma.visitor.update({
    where: { id: request.visitor.id },
    data: {
      approvalEscalatedAt: new Date(),
      escalationReason: reason || "No response from host",
    },
  });

  

  if (departmentHead.email) {
    await sendEmail(
      departmentHead.email,
      "Escalated Visitor Approval Request",
      `
        <h1>Escalated Visitor Approval Request</h1>
        <p>This visitor approval request has been escalated to you:</p>
        <ul>
          <li><strong>Visitor:</strong> ${request.visitor.firstName} ${request.visitor.lastName}</li>
          <li><strong>Reason:</strong> ${reason || "No response from host"}</li>
        </ul>
        <p><a href="${process.env.NEXTAUTH_URL}/visitors/approve/${requestId}">Review Request</a></p>
      `
    );
  }

  await prisma.visitorApprovalRequest.update({
    where: { id: requestId },
    data: { escalationNotifiedAt: new Date() },
  });
}


export async function bulkApproveGroupVisit(
  groupId: string,
  approvedBy: string
): Promise<{
  approved: number;
  visitorIds: string[];
}> {
  const visitors = await prisma.visitor.findMany({
    where: {
      groupId,
      status: "PENDING",
    },
    include: {
      approvalRequests: {
        where: { status: "PENDING" },
      },
    },
  });

  const approved: string[] = [];

  for (const visitor of visitors) {
    if (visitor.approvalRequests.length > 0) {
      const request = visitor.approvalRequests[0];
      try {
        const result = await approveVisitor(request.id, approvedBy);
        approved.push(result.visitorId);
      } catch (error) {
        console.error(`Failed to approve visitor ${visitor.id}:`, error);
      }
    }
  }

  return {
    approved: approved.length,
    visitorIds: approved,
  };
}


async function generateQRCode(visitorId: string): Promise<string> {
  const data = {
    visitorId,
    timestamp: Date.now(),
    secret: randomBytes(16).toString("hex"),
  };

  const qrData = JSON.stringify(data);
  const qrCode = await QRCode.toDataURL(qrData);

  

  const qrHash = createHash("sha256").update(qrData).digest("hex");

  return qrHash; 

}


async function checkSecurityClearance(visitor: any): Promise<boolean> {
  

  

  return visitor.securityLabel !== "TOP_SECRET";
}


async function verifyCAPTCHA(token: string): Promise<boolean> {
  

  

  return !!token;
}

