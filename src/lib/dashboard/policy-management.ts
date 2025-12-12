import { prisma } from "@/lib/prisma";
import { PolicyType } from "@/generated/prisma/enums";

/**
 * Get policy management data
 */
export async function getPolicyManagementData(): Promise<{
  total: number;
  byType: Array<{ type: PolicyType; count: number }>;
  enabled: number;
  disabled: number;
  recentChanges: any[];
}> {
  const policies = await prisma.accessPolicy.findMany({
    include: {
      owner: {
        select: { email: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const byType: Record<PolicyType, number> = {} as any;
  let enabled = 0;
  let disabled = 0;

  for (const policy of policies) {
    byType[policy.policyType] = (byType[policy.policyType] || 0) + 1;
    if (policy.enabled) {
      enabled++;
    } else {
      disabled++;
    }
  }

  const recentChanges = policies.slice(0, 20).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.policyType,
    enabled: p.enabled,
    updatedAt: p.updatedAt,
    updatedBy: p.owner?.email,
  }));

  return {
    total: policies.length,
    byType: Object.entries(byType).map(([type, count]) => ({
      type: type as PolicyType,
      count,
    })),
    enabled,
    disabled,
    recentChanges,
  };
}

/**
 * Test policy
 */
export async function testPolicy(
  policyId: string,
  testScenario: {
    userId: string;
    resourceType: string;
    resourceId: string;
    action: string;
    context?: Record<string, any>;
  }
): Promise<{
  allowed: boolean;
  reason?: string;
  evaluationSteps: Array<{ step: string; result: boolean; details?: any }>;
}> {
  const policy = await prisma.accessPolicy.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    throw new Error("Policy not found");
  }

  const evaluationSteps: Array<{ step: string; result: boolean; details?: any }> = [];

  // Test based on policy type
  switch (policy.policyType) {
    case "MAC":
      // Test MAC policy
      const { checkReadAccess } = await import("@/lib/access/mac");
      const macResult = await checkReadAccess(
        testScenario.userId,
        testScenario.resourceType,
        testScenario.resourceId
      );
      evaluationSteps.push({
        step: "MAC Check",
        result: macResult.allowed,
        details: macResult,
      });
      return {
        allowed: macResult.allowed,
        reason: macResult.reason,
        evaluationSteps,
      };

    case "RBAC":
      // Test RBAC policy
      const { getEffectivePermissions } = await import("@/lib/access/rbac");
      const rbacResult = await getEffectivePermissions(testScenario.userId);
      const hasPermission = rbacResult.some(
        (p) => p.resource === testScenario.resourceType && p.action === testScenario.action
      );
      evaluationSteps.push({
        step: "RBAC Check",
        result: hasPermission,
        details: rbacResult,
      });
      return {
        allowed: hasPermission,
        reason: hasPermission ? undefined : "User does not have required role/permission",
        evaluationSteps,
      };

    case "ABAC":
      // Test ABAC policy
      const { evaluateABACPolicy } = await import("@/lib/access/abac");
      const abacResult = await evaluateABACPolicy(
        policyId,
        testScenario.userId,
        testScenario.resourceType,
        testScenario.resourceId,
        testScenario.context || {}
      );
      evaluationSteps.push({
        step: "ABAC Check",
        result: abacResult.allowed,
        details: abacResult,
      });
      return {
        allowed: abacResult.allowed,
        reason: abacResult.reason,
        evaluationSteps,
      };

    default:
      return {
        allowed: false,
        reason: "Policy type not supported for testing",
        evaluationSteps,
      };
  }
}

/**
 * Deploy policy
 */
export async function deployPolicy(
  policyId: string,
  deployedBy: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const policy = await prisma.accessPolicy.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    throw new Error("Policy not found");
  }

  // Test policy before deployment
  // In production, run comprehensive tests

  // Enable policy
  await prisma.accessPolicy.update({
    where: { id: policyId },
    data: {
      enabled: true,
      updatedAt: new Date(),
    },
  });

  // Log deployment
  await prisma.auditLog.create({
    data: {
      userId: deployedBy,
      category: "SYSTEM",
      logType: "CONFIG_CHANGE",
      action: "policy_deployed",
      resource: "access_policy",
      resourceId: policyId,
      details: {
        policyName: policy.name,
        policyType: policy.policyType,
      },
      securityLabel: "INTERNAL",
    },
  });

  return {
    success: true,
    message: "Policy deployed successfully",
  };
}

/**
 * Get policy audit trail
 */
export async function getPolicyAuditTrail(
  policyId: string
): Promise<Array<{
  timestamp: Date;
  action: string;
  performedBy: string;
  details: any;
}>> {
  const logs = await prisma.auditLog.findMany({
    where: {
      resource: "access_policy",
      resourceId: policyId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  return logs.map((log) => ({
    timestamp: log.createdAt,
    action: log.action,
    performedBy: log.user?.email || "SYSTEM",
    details: log.details,
  }));
}



