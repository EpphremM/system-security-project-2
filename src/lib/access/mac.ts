import { prisma } from "@/lib/prisma";
import { SecurityLevel } from "@/generated/prisma/enums";

/**
 * Security level hierarchy for Bell-LaPadula model
 * Higher number = higher classification
 */
const SECURITY_LEVEL_HIERARCHY: Record<SecurityLevel, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
  TOP_SECRET: 4,
};

/**
 * Get numeric level for a security level
 */
export function getSecurityLevelValue(level: SecurityLevel): number {
  return SECURITY_LEVEL_HIERARCHY[level] ?? 0;
}

/**
 * Check if user clearance is greater than or equal to resource level
 * Bell-LaPadula Simple Security Property: No Read-Up
 * A subject at a given security level cannot read data at a higher security level
 */
export function canRead(
  userLevel: SecurityLevel,
  resourceLevel: SecurityLevel,
  userCompartments: string[],
  resourceCompartments: string[],
  trustedSubject: boolean = false
): boolean {
  // Trusted subjects (admins) can bypass read restrictions
  if (trustedSubject) {
    return true;
  }

  // Check level: user must have clearance >= resource level
  const userLevelValue = getSecurityLevelValue(userLevel);
  const resourceLevelValue = getSecurityLevelValue(resourceLevel);

  if (userLevelValue < resourceLevelValue) {
    return false; // No read-up
  }

  // Check compartments: user must have access to all resource compartments (need-to-know)
  if (resourceCompartments.length > 0) {
    const hasAllCompartments = resourceCompartments.every((compartment) =>
      userCompartments.includes(compartment)
    );
    if (!hasAllCompartments) {
      return false; // Missing required compartment
    }
  }

  return true;
}

/**
 * Check if user can write to resource
 * Bell-LaPadula Star Property: No Write-Down
 * A subject at a given security level cannot write data to a lower security level
 */
export function canWrite(
  userLevel: SecurityLevel,
  resourceLevel: SecurityLevel,
  userCompartments: string[],
  resourceCompartments: string[],
  trustedSubject: boolean = false
): boolean {
  // Trusted subjects (admins) can bypass write restrictions
  if (trustedSubject) {
    return true;
  }

  // Check level: user cannot write to lower classification (no write-down)
  const userLevelValue = getSecurityLevelValue(userLevel);
  const resourceLevelValue = getSecurityLevelValue(resourceLevel);

  if (userLevelValue < resourceLevelValue) {
    return false; // Cannot write to higher classification
  }

  // For write operations, user must have access to all resource compartments
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

/**
 * Check if user can declassify (lower) a resource
 * Only trusted subjects can declassify
 */
export function canDeclassify(
  currentLevel: SecurityLevel,
  targetLevel: SecurityLevel,
  trustedSubject: boolean
): boolean {
  if (!trustedSubject) {
    return false; // Only trusted subjects can declassify
  }

  const currentLevelValue = getSecurityLevelValue(currentLevel);
  const targetLevelValue = getSecurityLevelValue(targetLevel);

  // Can only declassify (lower the level)
  return targetLevelValue < currentLevelValue;
}

/**
 * Check if user can classify (raise) a resource
 * User must have clearance >= target level
 */
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

  // User must have clearance >= target level
  return userLevelValue >= targetLevelValue;
}

/**
 * Get user clearance with compartments
 */
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

  // Use clearance if exists, otherwise fall back to securityClearance
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

/**
 * Check if user can access resource (read)
 */
export async function checkReadAccess(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if user is SUPER_ADMIN - bypass all MAC checks
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

  // Special handling for visitors: check securityLabel directly from Visitor table
  if (resourceType === "visitor") {
    const visitor = await prisma.visitor.findUnique({
      where: { id: resourceId },
      select: { securityLabel: true, hostId: true },
    });

    if (!visitor) {
      return { allowed: false, reason: "Visitor not found" };
    }

    // If user is the host, they can always read their own visitor
    if (visitor.hostId === userId) {
      return { allowed: true };
    }

    // Check MAC clearance for visitor's security label
    const resourceLevel = visitor.securityLabel;
    const resourceCompartments: string[] = []; // Visitors don't have compartments by default

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

  // Get resource with security label
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

/**
 * Check if user can modify resource (write)
 */
export async function checkWriteAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  targetLevel?: SecurityLevel,
  targetCompartments?: string[]
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if user is SUPER_ADMIN - bypass all MAC checks
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

  // Get resource with security label
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

  // Check if user can write to this level
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

/**
 * Automatically classify resource based on content
 */
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

  // Check from highest to lowest classification
  const levels: SecurityLevel[] = ["TOP_SECRET", "RESTRICTED", "CONFIDENTIAL", "INTERNAL", "PUBLIC"];

  for (const level of levels) {
    const keywords = classificationKeywords[level];
    if (keywords.some((keyword) => contentLower.includes(keyword))) {
      // Determine compartments based on content
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

  // Default to INTERNAL if no keywords found
  return { level: "INTERNAL", compartments: [] };
}

/**
 * Get minimum clearance required for a set of resources
 */
export function getMinimumRequiredClearance(levels: SecurityLevel[]): SecurityLevel {
  if (levels.length === 0) {
    return "PUBLIC";
  }

  const levelValues = levels.map((level) => getSecurityLevelValue(level));
  const maxValue = Math.max(...levelValues);

  // Find the level with this value
  for (const [level, value] of Object.entries(SECURITY_LEVEL_HIERARCHY)) {
    if (value === maxValue) {
      return level as SecurityLevel;
    }
  }

  return "PUBLIC";
}



