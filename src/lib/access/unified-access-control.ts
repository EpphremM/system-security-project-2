

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessRoute, hasPermission, type Role } from "@/lib/auth/roles";
import { enforceMAC } from "@/middleware/mac";
import { enforceDAC } from "@/middleware/dac";
import { enforceRuBAC } from "@/middleware/rubac";
import { enforceABAC } from "@/middleware/abac";
import { userHasPermission } from "@/lib/access/rbac";

export interface AccessControlOptions {
  
  resourceType: string;
  resourceId?: string;
  action: string; 
  
  
  checkRBAC?: boolean; 
  checkMAC?: boolean; 
  checkDAC?: boolean; 
  checkRuBAC?: boolean; 
  checkABAC?: boolean; 
  
  
  targetSecurityLevel?: string;
  targetCompartments?: string[];
  
  
  abacContext?: {
    networkSecurityLevel?: string;
    threatIntelligenceScore?: number;
    systemMaintenanceStatus?: string;
  };
  
  
  requiredPermission?: string; 
  
  
  routePath?: string;
}

export interface AccessControlResult {
  allowed: boolean;
  response?: NextResponse;
  reasons?: string[];
  checkedMechanisms?: {
    rbac?: { allowed: boolean; reason?: string };
    mac?: { allowed: boolean; reason?: string };
    dac?: { allowed: boolean; reason?: string };
    rubac?: { allowed: boolean; reason?: string };
    abac?: { allowed: boolean; reason?: string };
  };
}


export async function checkAccess(
  request: NextRequest,
  options: AccessControlOptions
): Promise<AccessControlResult> {
  const session = await auth();
  
  
  if (!session?.user?.id) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      ),
      reasons: ["Not authenticated"],
    };
  }

  const userId = session.user.id;
  const userRole = (session.user.role as Role) || "USER";
  const reasons: string[] = [];
  const checkedMechanisms: AccessControlResult["checkedMechanisms"] = {};

  
  if (userRole === "SUPER_ADMIN") {
    return {
      allowed: true,
      checkedMechanisms: {
        rbac: { allowed: true, reason: "SUPER_ADMIN bypass" },
        mac: { allowed: true, reason: "SUPER_ADMIN bypass" },
        dac: { allowed: true, reason: "SUPER_ADMIN bypass" },
        rubac: { allowed: true, reason: "SUPER_ADMIN bypass" },
        abac: { allowed: true, reason: "SUPER_ADMIN bypass" },
      },
    };
  }

  
  if (options.checkRBAC !== false) {
    let rbacAllowed = true;
    let rbacReason: string | undefined;

    
    if (options.routePath) {
      if (!canAccessRoute(userRole, options.routePath)) {
        rbacAllowed = false;
        rbacReason = `Role ${userRole} cannot access route ${options.routePath}`;
      }
    }

    // Check specific permission if required
    if (options.requiredPermission) {
      const hasPerm = hasPermission(userRole, options.requiredPermission);
      if (!hasPerm) {
        rbacAllowed = false;
        rbacReason = `Role ${userRole} does not have permission: ${options.requiredPermission}`;
      }
    }

      // Also check database RBAC permissions (if resource and action provided)
    if (rbacAllowed && options.resourceType && options.action && options.resourceId) {
      try {
        const dbPermission = await userHasPermission(
          userId,
          options.resourceType,
          options.action
        );
        if (!dbPermission) {
          rbacAllowed = false;
          rbacReason = `User does not have ${options.action} permission on ${options.resourceType}`;
        }
      } catch (error) {
        // If RBAC check fails, log but don't block (graceful degradation)
        console.warn("RBAC permission check failed:", error);
      }
    }

    checkedMechanisms.rbac = {
      allowed: rbacAllowed,
      reason: rbacReason,
    };

    if (!rbacAllowed) {
      reasons.push(`RBAC: ${rbacReason || "Access denied"}`);
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: "Access Denied",
            message: "You don't have the required role or permission",
            reason: rbacReason,
            yourRole: userRole,
            requiredPermission: options.requiredPermission,
          },
          { status: 403 }
        ),
        reasons,
        checkedMechanisms,
      };
    }
  }

  // 2. MAC (Mandatory Access Control) - Check security clearance
  if (options.checkMAC && options.resourceId) {
    const macResult = await enforceMAC(
      request,
      options.resourceType,
      options.resourceId,
      options.action === "read" ? "read" : "write",
      options.targetSecurityLevel,
      options.targetCompartments
    );

    checkedMechanisms.mac = {
      allowed: macResult.allowed,
      reason: macResult.response
        ? (await macResult.response.json()).reason
        : undefined,
    };

    if (!macResult.allowed) {
      reasons.push(`MAC: Security clearance insufficient`);
      return {
        allowed: false,
        response: macResult.response,
        reasons,
        checkedMechanisms,
      };
    }
  }

  // 3. DAC (Discretionary Access Control) - Check ownership/sharing
  if (options.checkDAC && options.resourceId) {
    const dacResult = await enforceDAC(
      request,
      options.resourceType,
      options.resourceId,
      options.action
    );

    checkedMechanisms.dac = {
      allowed: dacResult.allowed,
      reason: dacResult.response
        ? (await dacResult.response.json()).reason
        : undefined,
    };

    if (!dacResult.allowed) {
      reasons.push(`DAC: No permission on resource`);
      return {
        allowed: false,
        response: dacResult.response,
        reasons,
        checkedMechanisms,
      };
    }
  }

  // 4. RuBAC (Rule-Based Access Control) - Check time/location/device rules
  if (options.checkRuBAC && options.resourceId) {
    const rubacResult = await enforceRuBAC(
      request,
      options.resourceType,
      options.resourceId,
      options.action
    );

    checkedMechanisms.rubac = {
      allowed: rubacResult.allowed,
      reason: rubacResult.response
        ? (await rubacResult.response.json()).reason
        : undefined,
    };

    if (!rubacResult.allowed) {
      reasons.push(`RuBAC: Rule violation`);
      return {
        allowed: false,
        response: rubacResult.response,
        reasons,
        checkedMechanisms,
      };
    }
  }

  // 5. ABAC (Attribute-Based Access Control) - Check attribute policies
  if (options.checkABAC && options.resourceId) {
    const abacResult = await enforceABAC(
      request,
      options.resourceType,
      options.resourceId,
      options.action,
      options.abacContext
    );

    checkedMechanisms.abac = {
      allowed: abacResult.allowed,
      reason: abacResult.response
        ? (await abacResult.response.json()).reason
        : undefined,
    };

    if (!abacResult.allowed) {
      reasons.push(`ABAC: Policy violation`);
      return {
        allowed: false,
        response: abacResult.response,
        reasons,
        checkedMechanisms,
      };
    }
  }

  // All checks passed
  return {
    allowed: true,
    checkedMechanisms,
  };
}

/**
 * Helper to check access for API routes
 */
export async function requireAccess(
  request: NextRequest,
  options: AccessControlOptions
): Promise<NextResponse | null> {
  const result = await checkAccess(request, options);
  
  if (!result.allowed) {
    return result.response || NextResponse.json(
      { error: "Access Denied" },
      { status: 403 }
    );
  }
  
  return null; // Access granted
}

/**
 * Helper to get user's effective permissions
 */
export async function getUserEffectivePermissions(userId: string): Promise<{
  role: Role;
  permissions: string[];
  clearance?: {
    level: string;
    compartments: string[];
  };
  isTrustedSubject: boolean;
}> {
  const session = await auth();
  
  if (!session?.user?.id || session.user.id !== userId) {
    throw new Error("Unauthorized");
  }

  const userRole = (session.user.role as Role) || "USER";
  
  // Get permissions from ROLE_PERMISSIONS
  const { ROLE_PERMISSIONS } = await import("@/lib/auth/roles");
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  const permissions = rolePermissions.includes("*") 
    ? ["*"] 
    : rolePermissions;

  // Get MAC clearance
  let clearance;
  try {
    const { getUserClearance } = await import("@/lib/access/mac");
    const userClearance = await getUserClearance(userId);
    if (userClearance) {
      clearance = {
        level: userClearance.level,
        compartments: userClearance.compartments || [],
      };
    }
  } catch (error) {
    // Clearance not set
  }

  // Check if trusted subject
  const { isTrustedSubject } = await import("@/middleware/mac");
  const isTrusted = await isTrustedSubject(userId);

  return {
    role: userRole,
    permissions,
    clearance,
    isTrustedSubject: isTrusted,
  };
}

