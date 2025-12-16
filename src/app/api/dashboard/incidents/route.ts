import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createIncident,
  updateIncidentStatus,
  addIncidentResponseStep,
  addIncidentCommunication,
  createIncidentPlaybook,
  completePostIncidentReview,
  getIncidentStatistics,
} from "@/lib/dashboard/incident-response";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  category: z.enum([
    "SECURITY_BREACH",
    "DATA_LEAK",
    "UNAUTHORIZED_ACCESS",
    "MALWARE",
    "DDoS",
    "PHISHING",
    "INSIDER_THREAT",
    "POLICY_VIOLATION",
    "SYSTEM_COMPROMISE",
    "OTHER",
  ]),
  reportedBy: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  playbookId: z.string().uuid().optional(),
  relatedLogIds: z.array(z.string().uuid()).optional(),
  relatedUserId: z.string().uuid().optional(),
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
    const action = body.action;

    if (action === "create") {
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.errors },
          { status: 400 }
        );
      }

      const incidentId = await createIncident(
        parsed.data.title,
        parsed.data.description,
        parsed.data.severity,
        parsed.data.category,
        {
          reportedBy: parsed.data.reportedBy || session.user.id,
          assignedTo: parsed.data.assignedTo,
          playbookId: parsed.data.playbookId,
          relatedLogIds: parsed.data.relatedLogIds,
          relatedUserId: parsed.data.relatedUserId,
        }
      );

      return NextResponse.json({
        success: true,
        incidentId,
        message: "Incident created successfully",
      });
    } else if (action === "update-status") {
      const { incidentId, status, notes } = body;
      if (!incidentId || !status) {
        return NextResponse.json(
          { error: "incidentId and status are required" },
          { status: 400 }
        );
      }

      await updateIncidentStatus(incidentId, status, session.user.id, notes);
      return NextResponse.json({
        success: true,
        message: "Incident status updated",
      });
    } else if (action === "add-step") {
      const { incidentId, step } = body;
      if (!incidentId || !step) {
        return NextResponse.json(
          { error: "incidentId and step are required" },
          { status: 400 }
        );
      }

      await addIncidentResponseStep(incidentId, step);
      return NextResponse.json({
        success: true,
        message: "Response step added",
      });
    } else if (action === "add-communication") {
      const { incidentId, communication } = body;
      if (!incidentId || !communication) {
        return NextResponse.json(
          { error: "incidentId and communication are required" },
          { status: 400 }
        );
      }

      await addIncidentCommunication(incidentId, {
        ...communication,
        sentBy: session.user.id,
      });
      return NextResponse.json({
        success: true,
        message: "Communication logged",
      });
    } else if (action === "create-playbook") {
      const { name, category, steps, templates } = body;
      if (!name || !category || !steps) {
        return NextResponse.json(
          { error: "name, category, and steps are required" },
          { status: 400 }
        );
      }

      const playbookId = await createIncidentPlaybook(name, category, steps, templates);
      return NextResponse.json({
        success: true,
        playbookId,
        message: "Playbook created successfully",
      });
    } else if (action === "complete-review") {
      const { incidentId, reviewNotes, lessonsLearned } = body;
      if (!incidentId || !reviewNotes || !lessonsLearned) {
        return NextResponse.json(
          { error: "incidentId, reviewNotes, and lessonsLearned are required" },
          { status: 400 }
        );
      }

      await completePostIncidentReview(incidentId, session.user.id, reviewNotes, lessonsLearned);
      return NextResponse.json({
        success: true,
        message: "Post-incident review completed",
      });
    } else {
      return NextResponse.json(
        { error: "Unknown action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Incident operation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to perform operation" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");

    if (view === "statistics") {
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      const data = await getIncidentStatistics({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
      return NextResponse.json(data);
    } else {
      
      const { prisma } = await import("@/lib/prisma");
      const incidents = await prisma.securityIncident.findMany({
        orderBy: { detectedAt: "desc" },
        take: 100,
        include: {
          
        },
      });

      return NextResponse.json({ incidents });
    }
  } catch (error) {
    console.error("Get incidents error:", error);
    return NextResponse.json(
      { error: "Failed to get incidents" },
      { status: 500 }
    );
  }
}

