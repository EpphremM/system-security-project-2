import { NextRequest, NextResponse } from "next/server";
import { preRegisterVisitor } from "@/lib/visitors/registration";
import { z } from "zod";

const preregisterSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(1),
  company: z.string().min(1),
  purpose: z.enum([
    "MEETING",
    "INTERVIEW",
    "DELIVERY",
    "MAINTENANCE",
    "TOUR",
    "TRAINING",
    "CONSULTATION",
    "OTHER",
  ]),
  hostId: z.string().uuid(),
  scheduledDate: z.string().datetime(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  idDocument: z.string().optional(),
  idDocumentType: z.string().optional(),
  isGroupVisit: z.boolean().optional(),
  groupSize: z.number().int().optional(),
  groupId: z.string().optional(),
  captchaToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = preregisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      purpose,
      hostId,
      scheduledDate,
      scheduledStart,
      scheduledEnd,
      idDocument,
      idDocumentType,
      isGroupVisit,
      groupSize,
      groupId,
      captchaToken,
    } = parsed.data;

    const result = await preRegisterVisitor(
      {
        firstName,
        lastName,
        email,
        phone,
        company,
        purpose: purpose as any,
        hostId,
        scheduledDate: new Date(scheduledDate),
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        idDocument,
        idDocumentType,
        isGroupVisit,
        groupSize,
        groupId,
      },
      captchaToken
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Pre-register visitor error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to pre-register visitor" },
      { status: 500 }
    );
  }
}



