import { prisma } from "@/lib/prisma";
import { SecurityLevel, ClearanceStatus, ClearanceChangeType } from "@/generated/prisma/enums";
import { getSecurityLevelValue } from "./mac";


export async function assignClearance(
  userId: string,
  level: SecurityLevel,
  compartments: string[],
  assignedBy: string,
  reason?: string,
  expiresAt?: Date
) {
  
  const nextReviewAt = new Date();
  nextReviewAt.setFullYear(nextReviewAt.getFullYear() + 1);

  
  const existingClearance = await prisma.userClearance.findUnique({
    where: { userId },
  });

  const previousLevel = existingClearance?.level;
  const previousCompartments = existingClearance?.compartments ?? [];

  
  const clearance = await prisma.userClearance.upsert({
    where: { userId },
    create: {
      userId,
      level,
      compartments,
      assignedBy,
      nextReviewAt,
      expiresAt,
      status: "ACTIVE",
    },
    update: {
      level,
      compartments,
      assignedBy,
      nextReviewAt,
      expiresAt,
      status: "ACTIVE",
      updatedAt: new Date(),
    },
  });

  
  if (existingClearance) {
    const changeType =
      getSecurityLevelValue(level) > getSecurityLevelValue(previousLevel ?? "PUBLIC")
        ? "UPGRADED"
        : getSecurityLevelValue(level) < getSecurityLevelValue(previousLevel ?? "PUBLIC")
        ? "DOWNGRADED"
        : "ASSIGNED";

    await prisma.clearanceHistory.create({
      data: {
        userId,
        previousLevel,
        newLevel: level,
        previousCompartments,
        newCompartments: compartments,
        changedBy: assignedBy,
        reason,
        changeType,
      },
    });
  } else {
    await prisma.clearanceHistory.create({
      data: {
        userId,
        newLevel: level,
        newCompartments: compartments,
        changedBy: assignedBy,
        reason,
        changeType: "ASSIGNED",
      },
    });
  }

  
  await prisma.user.update({
    where: { id: userId },
    data: {
      securityClearance: level,
    },
  });

  
  await prisma.auditLog.create({
    data: {
      userId: assignedBy,
      action: "clearance.assigned",
      resource: "user",
      resourceId: userId,
      securityLabel: level,
      details: {
        targetUserId: userId,
        level,
        compartments,
        reason,
      },
    },
  });

  return clearance;
}


export async function revokeClearance(
  userId: string,
  revokedBy: string,
  reason?: string
) {
  const existingClearance = await prisma.userClearance.findUnique({
    where: { userId },
  });

  if (!existingClearance) {
    throw new Error("User does not have clearance to revoke");
  }

  
  const clearance = await prisma.userClearance.update({
    where: { userId },
    data: {
      status: "REVOKED",
      updatedAt: new Date(),
    },
  });

  
  await prisma.clearanceHistory.create({
    data: {
      userId,
      previousLevel: existingClearance.level,
      newLevel: existingClearance.level, 
      previousCompartments: existingClearance.compartments,
      newCompartments: [], 
      changedBy: revokedBy,
      reason,
      changeType: "REVOKED",
    },
  });

  
  await prisma.auditLog.create({
    data: {
      userId: revokedBy,
      action: "clearance.revoked",
      resource: "user",
      resourceId: userId,
      securityLabel: existingClearance.level,
      details: {
        targetUserId: userId,
        reason,
      },
    },
  });

  return clearance;
}


export async function addCompartment(
  userId: string,
  compartment: string,
  addedBy: string,
  reason?: string
) {
  const clearance = await prisma.userClearance.findUnique({
    where: { userId },
  });

  if (!clearance) {
    throw new Error("User does not have clearance");
  }

  if (clearance.compartments.includes(compartment)) {
    return clearance; 
  }

  const newCompartments = [...clearance.compartments, compartment];

  const updated = await prisma.userClearance.update({
    where: { userId },
    data: {
      compartments: newCompartments,
      updatedAt: new Date(),
    },
  });

  
  await prisma.clearanceHistory.create({
    data: {
      userId,
      previousLevel: clearance.level,
      newLevel: clearance.level,
      previousCompartments: clearance.compartments,
      newCompartments,
      changedBy: addedBy,
      reason,
      changeType: "COMPARTMENT_ADDED",
    },
  });

  return updated;
}


export async function removeCompartment(
  userId: string,
  compartment: string,
  removedBy: string,
  reason?: string
) {
  const clearance = await prisma.userClearance.findUnique({
    where: { userId },
  });

  if (!clearance) {
    throw new Error("User does not have clearance");
  }

  const newCompartments = clearance.compartments.filter((c) => c !== compartment);

  const updated = await prisma.userClearance.update({
    where: { userId },
    data: {
      compartments: newCompartments,
      updatedAt: new Date(),
    },
  });

  
  await prisma.clearanceHistory.create({
    data: {
      userId,
      previousLevel: clearance.level,
      newLevel: clearance.level,
      previousCompartments: clearance.compartments,
      newCompartments,
      changedBy: removedBy,
      reason,
      changeType: "COMPARTMENT_REMOVED",
    },
  });

  return updated;
}


export async function requestEscalation(
  userId: string,
  targetLevel: SecurityLevel,
  targetCompartments: string[],
  reason: string
) {
  const clearance = await prisma.userClearance.findUnique({
    where: { userId },
  });

  if (!clearance) {
    throw new Error("User does not have clearance");
  }

  const updated = await prisma.userClearance.update({
    where: { userId },
    data: {
      escalationRequested: true,
      escalationReason: reason,
      escalationRequestedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  
  await prisma.auditLog.create({
    data: {
      userId,
      action: "clearance.escalation_requested",
      resource: "user",
      resourceId: userId,
      securityLabel: targetLevel,
      details: {
        currentLevel: clearance.level,
        targetLevel,
        targetCompartments,
        reason,
      },
    },
  });

  return updated;
}


export async function reviewClearance(
  userId: string,
  reviewedBy: string,
  approved: boolean,
  newLevel?: SecurityLevel,
  newCompartments?: string[],
  notes?: string
) {
  const clearance = await prisma.userClearance.findUnique({
    where: { userId },
  });

  if (!clearance) {
    throw new Error("User does not have clearance");
  }

  if (approved) {
    
    const nextReviewAt = new Date();
    nextReviewAt.setFullYear(nextReviewAt.getFullYear() + 1);

    const updateData: any = {
      nextReviewAt,
      updatedAt: new Date(),
    };

    if (newLevel) {
      updateData.level = newLevel;
    }
    if (newCompartments) {
      updateData.compartments = newCompartments;
    }

    await prisma.userClearance.update({
      where: { userId },
      data: updateData,
    });

    
    await prisma.clearanceHistory.create({
      data: {
        userId,
        previousLevel: clearance.level,
        newLevel: newLevel ?? clearance.level,
        previousCompartments: clearance.compartments,
        newCompartments: newCompartments ?? clearance.compartments,
        changedBy: reviewedBy,
        reason: notes,
        changeType: "REVIEWED",
      },
    });
  } else {
    
    await prisma.userClearance.update({
      where: { userId },
      data: {
        status: "SUSPENDED",
        updatedAt: new Date(),
      },
    });
  }

  
  await prisma.auditLog.create({
    data: {
      userId: reviewedBy,
      action: "clearance.reviewed",
      resource: "user",
      resourceId: userId,
      securityLabel: newLevel ?? clearance.level,
      details: {
        approved,
        newLevel,
        newCompartments,
        notes,
      },
    },
  });
}


export async function getUsersRequiringReview(daysBeforeDue: number = 30) {
  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + daysBeforeDue);

  return await prisma.userClearance.findMany({
    where: {
      status: "ACTIVE",
      nextReviewAt: {
        lte: reviewDate,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
        },
      },
    },
    orderBy: {
      nextReviewAt: "asc",
    },
  });
}



