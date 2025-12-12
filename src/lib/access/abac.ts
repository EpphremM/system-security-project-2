import { prisma } from "@/lib/prisma";
import { AttributeType, AttributeCategory, ValueType } from "@/generated/prisma/enums";

/**
 * Get all user attributes
 */
export async function getUserAttributes(userId: string) {
  const attributes = await prisma.userAttribute.findMany({
    where: {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      attribute: true,
    },
  });

  // Convert to key-value map
  const attributeMap: Record<string, any> = {};
  for (const attr of attributes) {
    attributeMap[attr.attribute.name] = parseAttributeValue(attr.value, attr.attribute.valueType);
  }

  return attributeMap;
}

/**
 * Get all resource attributes
 */
export async function getResourceAttributes(resourceType: string, resourceId: string) {
  // Get resource
  const resource = await prisma.resource.findUnique({
    where: {
      type_resourceId: {
        type: resourceType,
        resourceId,
      },
    },
    include: {
      resourceAttributes: {
        include: {
          attribute: true,
        },
      },
    },
  });

  if (!resource) {
    return {};
  }

  // Convert to key-value map
  const attributeMap: Record<string, any> = {};
  for (const attr of resource.resourceAttributes) {
    attributeMap[attr.attribute.name] = parseAttributeValue(attr.value, attr.attribute.valueType);
  }

  return attributeMap;
}

/**
 * Get environment attributes
 */
export async function getEnvironmentAttributes(context: {
  ipAddress?: string;
  currentTime?: Date;
  networkSecurityLevel?: string;
  threatIntelligenceScore?: number;
  systemMaintenanceStatus?: string;
}): Promise<Record<string, any>> {
  const attributes: Record<string, any> = {};

  // Time attributes
  const now = context.currentTime || new Date();
  attributes["current_time"] = now.toISOString();
  attributes["hour"] = now.getHours();
  attributes["day_of_week"] = now.getDay();
  attributes["day_of_month"] = now.getDate();
  attributes["month"] = now.getMonth() + 1;
  attributes["year"] = now.getFullYear();
  attributes["is_weekend"] = now.getDay() === 0 || now.getDay() === 6;
  attributes["is_business_hours"] = now.getHours() >= 8 && now.getHours() < 18;

  // Network security level
  if (context.networkSecurityLevel) {
    attributes["network_security_level"] = context.networkSecurityLevel;
  }

  // Threat intelligence score
  if (context.threatIntelligenceScore !== undefined) {
    attributes["threat_intelligence_score"] = context.threatIntelligenceScore;
  }

  // System maintenance status
  if (context.systemMaintenanceStatus) {
    attributes["system_maintenance_status"] = context.systemMaintenanceStatus;
    attributes["is_maintenance_mode"] = context.systemMaintenanceStatus === "MAINTENANCE";
  }

  // IP-based attributes
  if (context.ipAddress) {
    // Check if IP is from office network
    const isOfficeNetwork = await checkOfficeNetwork(context.ipAddress);
    attributes["is_office_network"] = isOfficeNetwork;

    // Check if IP is from VPN
    const isVPN = await checkVPNConnection(context.ipAddress);
    attributes["is_vpn"] = isVPN;
  }

  return attributes;
}

/**
 * Evaluate ABAC policy
 */
export async function evaluateABACPolicy(
  policyId: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  context: {
    ipAddress?: string;
    currentTime?: Date;
    networkSecurityLevel?: string;
    threatIntelligenceScore?: number;
    systemMaintenanceStatus?: string;
  }
): Promise<{ allowed: boolean; reason?: string }> {
  const policy = await prisma.accessPolicy.findUnique({
    where: { id: policyId },
  });

  if (!policy || !policy.enabled || policy.policyType !== "ABAC") {
    return { allowed: true }; // If policy doesn't exist or is disabled, allow
  }

  if (!policy.attributes) {
    return { allowed: true }; // No attribute conditions
  }

  // Get all attributes
  const userAttributes = await getUserAttributes(userId);
  const resourceAttributes = await getResourceAttributes(resourceType, resourceId);
  const environmentAttributes = await getEnvironmentAttributes(context);

  // Combine all attributes
  const allAttributes = {
    user: userAttributes,
    resource: resourceAttributes,
    environment: environmentAttributes,
  };

  // Evaluate attribute conditions
  const conditions = policy.attributes as any;
  const result = evaluateAttributeConditions(conditions, allAttributes);

  return result;
}

/**
 * Evaluate attribute conditions
 */
export function evaluateAttributeConditions(
  conditions: any,
  attributes: {
    user: Record<string, any>;
    resource: Record<string, any>;
    environment: Record<string, any>;
  }
): { allowed: boolean; reason?: string } {
  // Handle different condition structures

  // Simple condition: { attribute: "user.department", operator: "equals", value: "IT" }
  if (conditions.attribute && conditions.operator) {
    return evaluateSingleCondition(conditions, attributes);
  }

  // Complex condition with AND/OR logic
  if (conditions.operator === "AND" || conditions.operator === "OR") {
    const results = (conditions.conditions || []).map((cond: any) =>
      evaluateAttributeConditions(cond, attributes)
    );

    if (conditions.operator === "AND") {
      const failed = results.find((r: any) => !r.allowed);
      if (failed) {
        return failed;
      }
      return { allowed: true };
    } else {
      // OR
      const passed = results.find((r: any) => r.allowed);
      return passed || { allowed: false, reason: "None of the conditions matched" };
    }
  }

  // Array of conditions (default to AND)
  if (Array.isArray(conditions)) {
    for (const condition of conditions) {
      const result = evaluateAttributeConditions(condition, attributes);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true };
  }

  // Object with multiple conditions (default to AND)
  if (typeof conditions === "object") {
    for (const [key, value] of Object.entries(conditions)) {
      // Handle nested conditions
      if (typeof value === "object" && value !== null) {
        const result = evaluateAttributeConditions(value, attributes);
        if (!result.allowed) {
          return result;
        }
      } else {
        // Simple key-value check
        const attributeValue = getAttributeValue(key, attributes);
        if (attributeValue !== value) {
          return {
            allowed: false,
            reason: `Attribute ${key} does not match required value`,
          };
        }
      }
    }
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Evaluate single condition
 */
function evaluateSingleCondition(
  condition: {
    attribute: string;
    operator: string;
    value: any;
  },
  attributes: {
    user: Record<string, any>;
    resource: Record<string, any>;
    environment: Record<string, any>;
  }
): { allowed: boolean; reason?: string } {
  const attributeValue = getAttributeValue(condition.attribute, attributes);

  switch (condition.operator) {
    case "equals":
    case "==":
      return {
        allowed: attributeValue === condition.value,
        reason:
          attributeValue === condition.value
            ? undefined
            : `Attribute ${condition.attribute} (${attributeValue}) does not equal ${condition.value}`,
      };

    case "not_equals":
    case "!=":
      return {
        allowed: attributeValue !== condition.value,
        reason:
          attributeValue !== condition.value
            ? undefined
            : `Attribute ${condition.attribute} (${attributeValue}) equals ${condition.value}`,
      };

    case "in":
      const values = Array.isArray(condition.value) ? condition.value : [condition.value];
      return {
        allowed: values.includes(attributeValue),
        reason: values.includes(attributeValue)
          ? undefined
          : `Attribute ${condition.attribute} (${attributeValue}) not in ${values.join(", ")}`,
      };

    case "not_in":
      const notValues = Array.isArray(condition.value) ? condition.value : [condition.value];
      return {
        allowed: !notValues.includes(attributeValue),
        reason: !notValues.includes(attributeValue)
          ? undefined
          : `Attribute ${condition.attribute} (${attributeValue}) in ${notValues.join(", ")}`,
      };

    case "greater_than":
    case ">":
      return {
        allowed: Number(attributeValue) > Number(condition.value),
        reason:
          Number(attributeValue) > Number(condition.value)
            ? undefined
            : `Attribute ${condition.attribute} (${attributeValue}) not greater than ${condition.value}`,
      };

    case "greater_than_or_equal":
    case ">=":
      return {
        allowed: Number(attributeValue) >= Number(condition.value),
        reason:
          Number(attributeValue) >= Number(condition.value)
            ? undefined
            : `Attribute ${condition.attribute} (${attributeValue}) not >= ${condition.value}`,
      };

    case "less_than":
    case "<":
      return {
        allowed: Number(attributeValue) < Number(condition.value),
        reason:
          Number(attributeValue) < Number(condition.value)
            ? undefined
            : `Attribute ${condition.attribute} (${attributeValue}) not less than ${condition.value}`,
      };

    case "less_than_or_equal":
    case "<=":
      return {
        allowed: Number(attributeValue) <= Number(condition.value),
        reason:
          Number(attributeValue) <= Number(condition.value)
            ? undefined
            : `Attribute ${condition.attribute} (${attributeValue}) not <= ${condition.value}`,
      };

    case "contains":
      const strValue = String(attributeValue);
      const searchValue = String(condition.value);
      return {
        allowed: strValue.includes(searchValue),
        reason: strValue.includes(searchValue)
          ? undefined
          : `Attribute ${condition.attribute} (${attributeValue}) does not contain ${searchValue}`,
      };

    case "starts_with":
      return {
        allowed: String(attributeValue).startsWith(String(condition.value)),
        reason: String(attributeValue).startsWith(String(condition.value))
          ? undefined
          : `Attribute ${condition.attribute} does not start with ${condition.value}`,
      };

    case "ends_with":
      return {
        allowed: String(attributeValue).endsWith(String(condition.value)),
        reason: String(attributeValue).endsWith(String(condition.value))
          ? undefined
          : `Attribute ${condition.attribute} does not end with ${condition.value}`,
      };

    case "exists":
      return {
        allowed: attributeValue !== undefined && attributeValue !== null,
        reason:
          attributeValue !== undefined && attributeValue !== null
            ? undefined
            : `Attribute ${condition.attribute} does not exist`,
      };

    case "not_exists":
      return {
        allowed: attributeValue === undefined || attributeValue === null,
        reason:
          attributeValue === undefined || attributeValue === null
            ? undefined
            : `Attribute ${condition.attribute} exists`,
      };

    default:
      return {
        allowed: false,
        reason: `Unknown operator: ${condition.operator}`,
      };
  }
}

/**
 * Get attribute value from attribute path (e.g., "user.department", "resource.classification")
 */
function getAttributeValue(
  attributePath: string,
  attributes: {
    user: Record<string, any>;
    resource: Record<string, any>;
    environment: Record<string, any>;
  }
): any {
  const [category, ...path] = attributePath.split(".");

  if (category === "user") {
    return getNestedValue(attributes.user, path.join("."));
  } else if (category === "resource") {
    return getNestedValue(attributes.resource, path.join("."));
  } else if (category === "environment") {
    return getNestedValue(attributes.environment, path.join("."));
  } else {
    // Try all categories
    return (
      getNestedValue(attributes.user, attributePath) ||
      getNestedValue(attributes.resource, attributePath) ||
      getNestedValue(attributes.environment, attributePath)
    );
  }
}

/**
 * Get nested value from object
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Parse attribute value based on type
 */
function parseAttributeValue(value: string, valueType: ValueType): any {
  switch (valueType) {
    case "NUMBER":
      return Number(value);
    case "BOOLEAN":
      return value === "true" || value === "1";
    case "DATE":
    case "DATETIME":
      return new Date(value);
    case "JSON":
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

/**
 * Set user attribute
 */
export async function setUserAttribute(
  userId: string,
  attributeName: string,
  value: string,
  source?: string,
  expiresAt?: Date
) {
  // Get attribute definition
  const attributeDef = await prisma.attributeDefinition.findUnique({
    where: { name: attributeName },
  });

  if (!attributeDef) {
    throw new Error(`Attribute definition not found: ${attributeName}`);
  }

  // Validate value
  validateAttributeValue(value, attributeDef);

  // Create or update attribute
  return await prisma.userAttribute.upsert({
    where: {
      userId_attributeId: {
        userId,
        attributeId: attributeDef.id,
      },
    },
    create: {
      userId,
      attributeId: attributeDef.id,
      value,
      source,
      expiresAt,
    },
    update: {
      value,
      source,
      expiresAt,
      updatedAt: new Date(),
    },
  });
}

/**
 * Set resource attribute
 */
export async function setResourceAttribute(
  resourceType: string,
  resourceId: string,
  attributeName: string,
  value: string,
  source?: string,
  calculated: boolean = false
) {
  // Get or create resource
  let resource = await prisma.resource.findUnique({
    where: {
      type_resourceId: {
        type: resourceType,
        resourceId,
      },
    },
  });

  if (!resource) {
    throw new Error("Resource not found");
  }

  // Get attribute definition
  const attributeDef = await prisma.attributeDefinition.findUnique({
    where: { name: attributeName },
  });

  if (!attributeDef) {
    throw new Error(`Attribute definition not found: ${attributeName}`);
  }

  // Validate value
  validateAttributeValue(value, attributeDef);

  // Create or update attribute
  return await prisma.resourceAttribute.upsert({
    where: {
      resourceId_attributeId: {
        resourceId: resource.id,
        attributeId: attributeDef.id,
      },
    },
    create: {
      resourceId: resource.id,
      attributeId: attributeDef.id,
      value,
      source,
      calculated,
    },
    update: {
      value,
      source,
      calculated,
      updatedAt: new Date(),
    },
  });
}

/**
 * Validate attribute value
 */
function validateAttributeValue(value: string, attributeDef: any) {
  // Type validation
  switch (attributeDef.valueType) {
    case "NUMBER":
      if (isNaN(Number(value))) {
        throw new Error(`Value must be a number: ${value}`);
      }
      if (attributeDef.minValue && Number(value) < Number(attributeDef.minValue)) {
        throw new Error(`Value must be >= ${attributeDef.minValue}`);
      }
      if (attributeDef.maxValue && Number(value) > Number(attributeDef.maxValue)) {
        throw new Error(`Value must be <= ${attributeDef.maxValue}`);
      }
      break;

    case "BOOLEAN":
      if (value !== "true" && value !== "false" && value !== "1" && value !== "0") {
        throw new Error(`Value must be a boolean: ${value}`);
      }
      break;

    case "DATE":
    case "DATETIME":
      if (isNaN(Date.parse(value))) {
        throw new Error(`Value must be a valid date: ${value}`);
      }
      break;

    case "ENUM":
      if (attributeDef.allowedValues && !attributeDef.allowedValues.includes(value)) {
        throw new Error(`Value must be one of: ${attributeDef.allowedValues.join(", ")}`);
      }
      break;
  }

  // Pattern validation
  if (attributeDef.pattern) {
    const regex = new RegExp(attributeDef.pattern);
    if (!regex.test(value)) {
      throw new Error(`Value does not match required pattern: ${attributeDef.pattern}`);
    }
  }
}

/**
 * Initialize default attribute definitions
 */
export async function initializeDefaultAttributes() {
  const defaultAttributes = [
    // User attributes
    {
      name: "role",
      description: "User role",
      attributeType: "USER" as AttributeType,
      category: "IDENTITY" as AttributeCategory,
      valueType: "ENUM" as ValueType,
      allowedValues: ["SUPER_ADMIN", "ADMIN", "HR_MANAGER", "DEPARTMENT_HEAD", "SECURITY_OFFICER", "STAFF", "AUDITOR"],
    },
    {
      name: "department",
      description: "User department",
      attributeType: "USER" as AttributeType,
      category: "IDENTITY" as AttributeCategory,
      valueType: "STRING" as ValueType,
    },
    {
      name: "clearance",
      description: "Security clearance level",
      attributeType: "USER" as AttributeType,
      category: "SECURITY" as AttributeCategory,
      valueType: "ENUM" as ValueType,
      allowedValues: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "TOP_SECRET"],
    },
    {
      name: "employment_status",
      description: "Employment status",
      attributeType: "USER" as AttributeType,
      category: "EMPLOYMENT" as AttributeCategory,
      valueType: "ENUM" as ValueType,
      allowedValues: ["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED"],
    },
    {
      name: "contract_type",
      description: "Contract type",
      attributeType: "USER" as AttributeType,
      category: "EMPLOYMENT" as AttributeCategory,
      valueType: "ENUM" as ValueType,
      allowedValues: ["FULL_TIME", "PART_TIME", "CONTRACTOR", "INTERN"],
    },
    {
      name: "training_completed",
      description: "Training completion status",
      attributeType: "USER" as AttributeType,
      category: "EMPLOYMENT" as AttributeCategory,
      valueType: "BOOLEAN" as ValueType,
    },
    {
      name: "security_certification_level",
      description: "Security certification level",
      attributeType: "USER" as AttributeType,
      category: "SECURITY" as AttributeCategory,
      valueType: "NUMBER" as ValueType,
    },
    // Resource attributes
    {
      name: "classification",
      description: "Resource classification level",
      attributeType: "RESOURCE" as AttributeType,
      category: "CLASSIFICATION" as AttributeCategory,
      valueType: "ENUM" as ValueType,
      allowedValues: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "TOP_SECRET"],
    },
    {
      name: "owner_department",
      description: "Owner department",
      attributeType: "RESOURCE" as AttributeType,
      category: "METADATA" as AttributeCategory,
      valueType: "STRING" as ValueType,
    },
    {
      name: "creation_date",
      description: "Resource creation date",
      attributeType: "RESOURCE" as AttributeType,
      category: "METADATA" as AttributeCategory,
      valueType: "DATETIME" as ValueType,
    },
    {
      name: "sensitivity_score",
      description: "Sensitivity score (0-100)",
      attributeType: "RESOURCE" as AttributeType,
      category: "METADATA" as AttributeCategory,
      valueType: "NUMBER" as ValueType,
      minValue: "0",
      maxValue: "100",
    },
    {
      name: "data_retention_period",
      description: "Data retention period in days",
      attributeType: "RESOURCE" as AttributeType,
      category: "METADATA" as AttributeCategory,
      valueType: "NUMBER" as ValueType,
    },
  ];

  for (const attr of defaultAttributes) {
    await prisma.attributeDefinition.upsert({
      where: { name: attr.name },
      create: attr,
      update: {
        description: attr.description,
        valueType: attr.valueType,
        allowedValues: attr.allowedValues,
        minValue: attr.minValue,
        maxValue: attr.maxValue,
      },
    });
  }
}

// Helper functions (reuse from rubac.ts)
async function checkOfficeNetwork(ipAddress: string): Promise<boolean> {
  const officeNetworks = await prisma.iPWhitelist.findMany({
    where: {
      location: { contains: "Office" },
      enabled: true,
    },
  });

  for (const network of officeNetworks) {
    for (const range of network.ipRanges) {
      if (isIPInRange(ipAddress, range)) {
        return true;
      }
    }
  }

  return false;
}

async function checkVPNConnection(ipAddress: string): Promise<boolean> {
  const vpnNetworks = await prisma.iPWhitelist.findMany({
    where: {
      location: { contains: "VPN" },
      enabled: true,
    },
  });

  for (const network of vpnNetworks) {
    for (const range of network.ipRanges) {
      if (isIPInRange(ipAddress, range)) {
        return true;
      }
    }
  }

  return false;
}

function isIPInRange(ip: string, range: string): boolean {
  if (range.includes("/")) {
    const [network, prefixLength] = range.split("/");
    return ip.startsWith(network.split(".").slice(0, parseInt(prefixLength) / 8).join("."));
  }
  return ip === range;
}



