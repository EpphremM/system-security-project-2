import { prisma } from "@/lib/prisma";
import { SecurityLevel } from "@/generated/prisma/enums";


const SECURITY_LEVEL_HIERARCHY: Record<SecurityLevel, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
  TOP_SECRET: 4,
};


export function getSecurityLevelValue(level: SecurityLevel): number {
  return SECURITY_LEVEL_HIERARCHY[level] ?? 0;
}


export function canRead(
  userLevel: SecurityLevel,
  resourceLevel: SecurityLevel,
  userCompartments: string[],
  resourceCompartments: string[],
  trustedSubject: boolean = false
): boolean {
  
  if (trustedSubject) {
    return true;
  }

  
  const userLevelValue = getSecurityLevelValue(userLevel);
  const resourceLevelValue = getSecurityLevelValue(resourceLevel);

  if (userLevelValue < resourceLevelValue) {
    return false; 
  }

  
  if (resourceCompartments.length > 0) {
    const hasAllCompartments = resourceCompartments.every((compartment) =>
      userCompartments.includes(compartment)
    );
    if (!hasAllCompartments) {
      return false; 
    }
  }

  return true;
}


export function canWrite(
  userLevel: SecurityLevel,
  resourceLevel: SecurityLevel,
  userCompartments: string[],
  resourceCompartments: string[],
  trustedSubject: boolean = false
): boolean {
  
  if (trustedSubject) {
    return true;
  }

  
  const userLevelValue = getSecurityLevelValue(userLevel);
  const resourceLevelValue = getSecurityLevelValue(resourceLevel);

  if (userLevelValue < resourceLevelValue) {
    return false; 
  }

  
  if (resourceCompartments.length > 0) {
    const hasAllCompartments = resourceCompartments.every((compartment) =>
      userCompartments.includes(compartment)
    );
    if (!hasAllCompartments) {
      return false;
    }
  }

  return true;
}


export function canDeclassify(
  currentLevel: SecurityLevel,
  targetLevel: SecurityLevel,
  trustedSubject: boolean
): boolean {
  if (!trustedSubject) {
    return false; 
  }

  const currentLevelValue = getSecurityLevelValue(currentLevel);
  const targetLevelValue = getSecurityLevelValue(targetLevel);

  
  return targetLevelValue < currentLevelValue;
}


export function canClassify(
  userLevel: SecurityLevel,
  targetLevel: SecurityLevel,
  trustedSubject: boolean = false
): boolean {
  if (trustedSubject) {
    return true;
  }

  const userLevelValue = getSecurityLevelValue(userLevel);
  const targetLevelValue = getSecurityLevelValue(targetLevel);

  
  return userLevelValue >= targetLevelValue;
}


export async function getUserClearance(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      clearance: true,
      clearanceCompartments: true,
    },
  });

  if (!user) {
    return null;
  }

  
  const level = user.clearance?.level ?? user.securityClearance;
  const compartments = user.clearance?.compartments ?? [];
  const trustedSubject = user.trustedSubject ?? false;

  return {
    level,
    compartments,
    trustedSubject,
    clearance: user.clearance,
  };
}


export async function checkReadAccess(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<{ allowed: boolean; reason?: string }> {
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { legacyRole: true },
  });

  if (user?.legacyRole === "SUPER_ADMIN") {
    return { allowed: true, reason: "SUPER_ADMIN bypass" };
  }

  const userClearance = await getUserClearance(userId);
  if (!userClearance) {
    return { allowed: false, reason: "User not found" };
  }

  
  if (resourceType === "visitor") {
    const visitor = await prisma.visitor.findUnique({
      where: { id: resourceId },
      select: { securityLabel: true, hostId: true },
    });

    if (!visitor) {
      return { allowed: false, reason: "Visitor not found" };
    }

    
    if (visitor.hostId === userId) {
      return { allowed: true };
    }

    
    const resourceLevel = visitor.securityLabel;
    const resourceCompartments: string[] = []; 

    const allowed = canRead(
      userClearance.level,
      resourceLevel,
      userClearance.compartments,
      resourceCompartments,
      userClearance.trustedSubject
    );

    return {
      allowed,
      reason: allowed ? undefined : "Insufficient clearance to view this visitor",
    };
  }

  
  const resource = await prisma.resource.findUnique({
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
    return { allowed: false, reason: "Resource not found" };
  }

  const resourceLevel = resource.securityLabel.classification;
  const resourceCompartments = resource.securityLabel.compartments ?? [];

  const allowed = canRead(
    userClearance.level,
    resourceLevel,
    userClearance.compartments,
    resourceCompartments,
    userClearance.trustedSubject
  );

  return {
    allowed,
    reason: allowed ? undefined : "Insufficient clearance or missing compartments",
  };
}


export async function checkWriteAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  targetLevel?: SecurityLevel,
  targetCompartments?: string[]
): Promise<{ allowed: boolean; reason?: string }> {
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { legacyRole: true },
  });

  if (user?.legacyRole === "SUPER_ADMIN") {
    return { allowed: true, reason: "SUPER_ADMIN bypass" };
  }
  const userClearance = await getUserClearance(userId);
  if (!userClearance) {
    return { allowed: false, reason: "User not found" };
  }

  
  const resource = await prisma.resource.findUnique({
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
    return { allowed: false, reason: "Resource not found" };
  }

  const resourceLevel = targetLevel ?? resource.securityLabel.classification;
  const resourceCompartments = targetCompartments ?? resource.securityLabel.compartments ?? [];

  
  const allowed = canWrite(
    userClearance.level,
    resourceLevel,
    userClearance.compartments,
    resourceCompartments,
    userClearance.trustedSubject
  );

  return {
    allowed,
    reason: allowed ? undefined : "Cannot write to this classification level (no write-down rule)",
  };
}


export function autoClassifyContent(
  content: string,
  keywords: Record<SecurityLevel, string[]> = {}
): { level: SecurityLevel; compartments: string[] } {
  const defaultKeywords: Record<SecurityLevel, string[]> = {
    PUBLIC: [],
    INTERNAL: ["internal", "staff", "employee"],
    CONFIDENTIAL: ["confidential", "sensitive", "private"],
    RESTRICTED: ["restricted", "classified", "secret"],
    TOP_SECRET: ["top secret", "highly classified", "compartment"],
  };

  const classificationKeywords = { ...defaultKeywords, ...keywords };
  const contentLower = content.toLowerCase();

  
  const levels: SecurityLevel[] = ["TOP_SECRET", "RESTRICTED", "CONFIDENTIAL", "INTERNAL", "PUBLIC"];

  for (const level of levels) {
    const keywords = classificationKeywords[level];
    if (keywords.some((keyword) => contentLower.includes(keyword))) {
      
      const compartments: string[] = [];
      if (contentLower.includes("financial") || contentLower.includes("budget") || contentLower.includes("revenue")) {
        compartments.push("FINANCIAL");
      }
      if (contentLower.includes("personnel") || contentLower.includes("employee") || contentLower.includes("hr")) {
        compartments.push("PERSONNEL");
      }
      if (contentLower.includes("visitor") || contentLower.includes("guest")) {
        compartments.push("VISITOR");
      }
      if (contentLower.includes("operational") || contentLower.includes("process")) {
        compartments.push("OPERATIONAL");
      }

      return { level, compartments };
    }
  }

  
  return { level: "INTERNAL", compartments: [] };
}


export function getMinimumRequiredClearance(levels: SecurityLevel[]): SecurityLevel {
  if (levels.length === 0) {
    return "PUBLIC";
  }

  const levelValues = levels.map((level) => getSecurityLevelValue(level));
  const maxValue = Math.max(...levelValues);

  
  for (const [level, value] of Object.entries(SECURITY_LEVEL_HIERARCHY)) {
    if (value === maxValue) {
      return level as SecurityLevel;
    }
  }

  return "PUBLIC";
}



