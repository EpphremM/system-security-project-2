import { prisma } from "@/lib/prisma";
import {
  IncidentSeverity,
  IncidentCategory,
  IncidentStatus,
} from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/utils/email";

/**
 * Create security incident
 */
export async function createIncident(
  title: string,
  description: string,
  severity: IncidentSeverity,
  category: IncidentCategory,
  options?: {
    reportedBy?: string;
    assignedTo?: string;
    playbookId?: string;
    relatedLogIds?: string[];
    relatedUserId?: string;
  }
): Promise<string> {
  const incident = await prisma.securityIncident.create({
    data: {
      title,
      description,
      severity,
      category,
      status: "OPEN",
      reportedBy: options?.reportedBy,
      assignedTo: options?.assignedTo,
      playbookId: options?.playbookId,
      relatedLogIds: options?.relatedLogIds || [],
      relatedUserId: options?.relatedUserId,
    },
  });

  // Notify assigned user if provided
  if (options?.assignedTo) {
    await notifyIncidentAssignment(incident.id, options.assignedTo);
  }

  // Apply playbook if provided
  if (options?.playbookId) {
    await applyIncidentPlaybook(incident.id, options.playbookId);
  }

  return incident.id;
}

/**
 * Update incident status
 */
export async function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
  updatedBy: string,
  notes?: string
): Promise<void> {
  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === "RESOLVED" || status === "CLOSED") {
    updateData.resolvedAt = new Date();
    updateData.resolvedBy = updatedBy;
    updateData.resolutionNotes = notes;
  }

  await prisma.securityIncident.update({
    where: { id: incidentId },
    data: updateData,
  });
}

/**
 * Add response step to incident
 */
export async function addIncidentResponseStep(
  incidentId: string,
  step: {
    name: string;
    description: string;
    completed: boolean;
    completedBy?: string;
    completedAt?: Date;
  }
): Promise<void> {
  const incident = await prisma.securityIncident.findUnique({
    where: { id: incidentId },
  });

  if (!incident) {
    throw new Error("Incident not found");
  }

  const responseSteps = (incident.responseSteps as any) || [];
  responseSteps.push({
    ...step,
    addedAt: new Date().toISOString(),
  });

  await prisma.securityIncident.update({
    where: { id: incidentId },
    data: {
      responseSteps,
    },
  });
}

/**
 * Add communication log entry
 */
export async function addIncidentCommunication(
  incidentId: string,
  communication: {
    type: "EMAIL" | "SMS" | "CALL" | "MEETING" | "OTHER";
    recipient: string;
    subject?: string;
    message: string;
    sentBy: string;
  }
): Promise<void> {
  const incident = await prisma.securityIncident.findUnique({
    where: { id: incidentId },
  });

  if (!incident) {
    throw new Error("Incident not found");
  }

  const communicationLog = (incident.communicationLog as any) || [];
  communicationLog.push({
    ...communication,
    timestamp: new Date().toISOString(),
  });

  await prisma.securityIncident.update({
    where: { id: incidentId },
    data: {
      communicationLog,
    },
  });

  // Send communication if type is EMAIL
  if (communication.type === "EMAIL") {
    await sendEmail(
      communication.recipient,
      communication.subject || `Security Incident: ${incident.title}`,
      communication.message
    );
  }
}

/**
 * Create incident playbook
 */
export async function createIncidentPlaybook(
  name: string,
  category: IncidentCategory,
  steps: Array<{
    step: number;
    name: string;
    description: string;
    action: string;
  }>,
  templates?: Array<{
    type: "EMAIL" | "SMS";
    name: string;
    subject?: string;
    body: string;
  }>
): Promise<string> {
  const playbook = await prisma.incidentPlaybook.create({
    data: {
      name,
      category,
      steps,
      templates: templates || [],
      enabled: true,
    },
  });

  return playbook.id;
}

/**
 * Apply incident playbook
 */
async function applyIncidentPlaybook(
  incidentId: string,
  playbookId: string
): Promise<void> {
  const playbook = await prisma.incidentPlaybook.findUnique({
    where: { id: playbookId },
  });

  if (!playbook) {
    throw new Error("Playbook not found");
  }

  const steps = playbook.steps as any[];
  const responseSteps = steps.map((step) => ({
    ...step,
    completed: false,
  }));

  await prisma.securityIncident.update({
    where: { id: incidentId },
    data: {
      playbookId,
      responseSteps,
    },
  });
}

/**
 * Notify incident assignment
 */
async function notifyIncidentAssignment(
  incidentId: string,
  assignedTo: string
): Promise<void> {
  const [incident, user] = await Promise.all([
    prisma.securityIncident.findUnique({
      where: { id: incidentId },
    }),
    prisma.user.findUnique({
      where: { id: assignedTo },
      select: { email: true, name: true },
    }),
  ]);

  if (!incident || !user || !user.email) {
    return;
  }

  await sendEmail(
    user.email,
    `Security Incident Assigned: ${incident.title}`,
    `
      <h1>Security Incident Assigned</h1>
      <p>You have been assigned to handle a security incident:</p>
      <ul>
        <li><strong>Title:</strong> ${incident.title}</li>
        <li><strong>Severity:</strong> ${incident.severity}</li>
        <li><strong>Category:</strong> ${incident.category}</li>
        <li><strong>Description:</strong> ${incident.description}</li>
      </ul>
      <p><a href="${process.env.NEXTAUTH_URL}/incidents/${incidentId}">View Incident</a></p>
    `
  );
}

/**
 * Complete post-incident review
 */
export async function completePostIncidentReview(
  incidentId: string,
  reviewedBy: string,
  reviewNotes: string,
  lessonsLearned: string
): Promise<void> {
  await prisma.securityIncident.update({
    where: { id: incidentId },
    data: {
      reviewedAt: new Date(),
      reviewedBy,
      reviewNotes,
      lessonsLearned,
      status: "CLOSED",
    },
  });
}

/**
 * Get incident statistics
 */
export async function getIncidentStatistics(options?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  total: number;
  byStatus: Array<{ status: IncidentStatus; count: number }>;
  bySeverity: Array<{ severity: IncidentSeverity; count: number }>;
  byCategory: Array<{ category: IncidentCategory; count: number }>;
  averageResolutionTime: number; // in hours
  openIncidents: number;
  criticalIncidents: number;
}> {
  const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options?.endDate || new Date();

  const where = {
    detectedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  const incidents = await prisma.securityIncident.findMany({
    where,
  });

  const byStatus: Record<IncidentStatus, number> = {} as any;
  const bySeverity: Record<IncidentSeverity, number> = {} as any;
  const byCategory: Record<IncidentCategory, number> = {} as any;

  let totalResolutionTime = 0;
  let resolvedCount = 0;

  for (const incident of incidents) {
    byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;
    bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
    byCategory[incident.category] = (byCategory[incident.category] || 0) + 1;

    if (incident.resolvedAt && incident.detectedAt) {
      const resolutionTime = incident.resolvedAt.getTime() - incident.detectedAt.getTime();
      totalResolutionTime += resolutionTime;
      resolvedCount++;
    }
  }

  const averageResolutionTime = resolvedCount > 0
    ? totalResolutionTime / resolvedCount / (1000 * 60 * 60) // Convert to hours
    : 0;

  return {
    total: incidents.length,
    byStatus: Object.entries(byStatus).map(([status, count]) => ({
      status: status as IncidentStatus,
      count,
    })),
    bySeverity: Object.entries(bySeverity).map(([severity, count]) => ({
      severity: severity as IncidentSeverity,
      count,
    })),
    byCategory: Object.entries(byCategory).map(([category, count]) => ({
      category: category as IncidentCategory,
      count,
    })),
    averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
    openIncidents: incidents.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS").length,
    criticalIncidents: incidents.filter((i) => i.severity === "CRITICAL").length,
  };
}



