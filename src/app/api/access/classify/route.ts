import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { autoClassifyContent, canClassify } from "@/lib/access/mac";
import { prisma } from "@/lib/prisma";
import { getUserClearance } from "@/lib/access/mac";

const classifySchema = z.object({
  resourceType: z.string(),
  resourceId: z.string(),
  content: z.string(),
  keywords: z.record(z.array(z.string())).optional(),
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
    const parsed = classifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { resourceType, resourceId, content, keywords } = parsed.data;

    
    const classification = autoClassifyContent(content, keywords);

    
    const userClearance = await getUserClearance(session.user.id);
    if (!userClearance) {
      return NextResponse.json(
        { error: "User clearance not found" },
        { status: 404 }
      );
    }

    const canClassifyToLevel = canClassify(
      userClearance.level,
      classification.level,
      userClearance.trustedSubject
    );

    if (!canClassifyToLevel) {
      return NextResponse.json(
        {
          error: "Insufficient clearance to classify to this level",
          classification,
        },
        { status: 403 }
      );
    }

    
    let resource = await prisma.resource.findUnique({
      where: {
        type_resourceId: {
          type: resourceType,
          resourceId,
        },
      },
      include: {
        securityLabel: true,
      },
    });

    if (!resource) {
      
      const securityLabel = await prisma.securityLabel.findFirst({
        where: {
          classification: classification.level,
          compartments: {
            hasEvery: classification.compartments,
          },
        },
      });

      let labelId: string;
      if (securityLabel) {
        labelId = securityLabel.id;
      } else {
        
        const newLabel = await prisma.securityLabel.create({
          data: {
            name: `${classification.level}_${classification.compartments.join("_")}`,
            level: classification.level === "PUBLIC" ? 0 : classification.level === "INTERNAL" ? 1 : classification.level === "CONFIDENTIAL" ? 2 : classification.level === "RESTRICTED" ? 3 : 4,
            classification: classification.level,
            dataCategory: "GENERAL",
            compartments: classification.compartments,
          },
        });
        labelId = newLabel.id;
      }

      resource = await prisma.resource.create({
        data: {
          type: resourceType,
          resourceId,
          ownerId: session.user.id,
          securityLabelId: labelId,
        },
        include: {
          securityLabel: true,
        },
      });
    } else {
      

      const canDeclassify = userClearance.trustedSubject; 


      if (canDeclassify) {
        const securityLabel = await prisma.securityLabel.findFirst({
          where: {
            classification: classification.level,
            compartments: {
              hasEvery: classification.compartments,
            },
          },
        });

        let labelId: string;
        if (securityLabel) {
          labelId = securityLabel.id;
        } else {
          const newLabel = await prisma.securityLabel.create({
            data: {
              name: `${classification.level}_${classification.compartments.join("_")}`,
              level: classification.level === "PUBLIC" ? 0 : classification.level === "INTERNAL" ? 1 : classification.level === "CONFIDENTIAL" ? 2 : classification.level === "RESTRICTED" ? 3 : 4,
              classification: classification.level,
              dataCategory: "GENERAL",
              compartments: classification.compartments,
            },
          });
          labelId = newLabel.id;
        }

        resource = await prisma.resource.update({
          where: {
            type_resourceId: {
              type: resourceType,
              resourceId,
            },
          },
          data: {
            securityLabelId: labelId,
          },
          include: {
            securityLabel: true,
          },
        });
      }
    }

    

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "access.classify",
        resource: resourceType,
        resourceId,
        securityLabel: classification.level,
        details: {
          classification,
          contentLength: content.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      classification,
      resource: {
        id: resource.id,
        securityLabel: resource.securityLabel,
      },
    });
  } catch (error) {
    console.error("Classification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to classify resource" },
      { status: 500 }
    );
  }
}



