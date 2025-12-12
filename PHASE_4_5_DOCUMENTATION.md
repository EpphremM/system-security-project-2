# Phase 4.5: Attribute-Based Access Control (ABAC)

## Overview

Implementation of fine-grained, dynamic Attribute-Based Access Control (ABAC) system. Access decisions are made based on attributes of users, resources, and the environment, enabling flexible and context-aware access control.

## Features Implemented

### 1. Attributes Framework ✅

#### User Attributes
- **Role**: User's role (SUPER_ADMIN, ADMIN, HR_MANAGER, etc.)
- **Department**: User's department
- **Clearance**: Security clearance level
- **Employment Status**: ACTIVE, INACTIVE, SUSPENDED, TERMINATED
- **Contract Type**: FULL_TIME, PART_TIME, CONTRACTOR, INTERN
- **Training Completion**: Boolean status
- **Security Certification Level**: Numeric certification level

#### Resource Attributes
- **Classification**: Security classification level
- **Owner Department**: Department that owns the resource
- **Creation Date**: When resource was created
- **Sensitivity Score**: Numeric score (0-100)
- **Data Retention Period**: Retention period in days

#### Environment Attributes
- **Current Time**: Current date and time
- **Hour, Day, Month, Year**: Time components
- **Day of Week**: 0-6 (Sunday-Saturday)
- **Is Weekend**: Boolean
- **Is Business Hours**: Boolean (8:00-18:00)
- **Network Security Level**: Network security status
- **Threat Intelligence Score**: Current threat score
- **System Maintenance Status**: MAINTENANCE, OPERATIONAL, etc.
- **Is Office Network**: Boolean
- **Is VPN**: Boolean

### 2. Attribute Management ✅

- **Attribute Definitions**: Define attribute types and constraints
- **User Attributes**: Set and manage user attributes
- **Resource Attributes**: Set and manage resource attributes
- **Environment Attributes**: Automatically evaluated from context
- **Value Validation**: Type checking and constraint validation
- **Expiration Support**: Time-bound attribute values

### 3. Policy Evaluation Engine ✅

- **Dynamic Evaluation**: Policies evaluated at access time
- **Multiple Operators**: equals, not_equals, in, not_in, greater_than, less_than, contains, etc.
- **Complex Conditions**: AND/OR logic support
- **Nested Conditions**: Hierarchical condition evaluation
- **Attribute Paths**: Support for user.attribute, resource.attribute, environment.attribute

## Database Schema

### AttributeDefinition Model
```prisma
model AttributeDefinition {
  id          String   @id @default(uuid())
  name        String   @unique
  attributeType AttributeType // USER, RESOURCE, ENVIRONMENT, COMPOSITE
  category    AttributeCategory
  valueType   ValueType // STRING, NUMBER, BOOLEAN, DATE, DATETIME, ENUM, JSON
  allowedValues String[]
  defaultValue String?
  minValue    String?
  maxValue    String?
  pattern     String?
  isSystem    Boolean
  enabled     Boolean
}
```

### UserAttribute Model
```prisma
model UserAttribute {
  id          String   @id @default(uuid())
  userId      String
  attributeId String
  value       String
  source      String?
  verified    Boolean
  verifiedBy  String?
  verifiedAt  DateTime?
  expiresAt   DateTime?
}
```

### ResourceAttribute Model
```prisma
model ResourceAttribute {
  id          String   @id @default(uuid())
  resourceId  String
  attributeId String
  value       String
  source      String?
  calculated  Boolean
}
```

## API Routes

### Attribute Management

#### `POST /api/access/abac/attributes/initialize`
Initialize default attribute definitions.

#### `POST /api/access/abac/attributes/user`
Set user attribute.

**Request:**
```json
{
  "attributeName": "training_completed",
  "value": "true",
  "source": "HR_SYSTEM",
  "expiresAt": "2025-12-31T00:00:00Z"
}
```

#### `GET /api/access/abac/attributes/user?userId=uuid`
Get user attributes.

#### `POST /api/access/abac/attributes/resource`
Set resource attribute.

**Request:**
```json
{
  "resourceType": "visitor",
  "resourceId": "visitor-uuid",
  "attributeName": "sensitivity_score",
  "value": "75",
  "source": "AUTO_CALCULATED",
  "calculated": true
}
```

#### `GET /api/access/abac/attributes/resource?resourceType=visitor&resourceId=uuid`
Get resource attributes.

### Policy Management

#### `POST /api/access/abac/policies/create`
Create ABAC policy.

**Request:**
```json
{
  "name": "High Sensitivity Access",
  "description": "Only trained users can access high sensitivity resources",
  "resource": "visitor",
  "action": "read",
  "attributes": {
    "operator": "AND",
    "conditions": [
      {
        "attribute": "user.training_completed",
        "operator": "equals",
        "value": "true"
      },
      {
        "attribute": "resource.sensitivity_score",
        "operator": "greater_than",
        "value": "50"
      },
      {
        "attribute": "environment.is_business_hours",
        "operator": "equals",
        "value": true
      }
    ]
  },
  "priority": 10,
  "enabled": true
}
```

#### `POST /api/access/abac/policies/evaluate`
Evaluate ABAC policy.

**Request:**
```json
{
  "policyId": "policy-uuid",
  "resourceType": "visitor",
  "resourceId": "visitor-uuid",
  "networkSecurityLevel": "HIGH",
  "threatIntelligenceScore": 5,
  "systemMaintenanceStatus": "OPERATIONAL"
}
```

## Utility Functions

### ABAC Functions (`src/lib/access/abac.ts`)

- `getUserAttributes()` - Get all user attributes
- `getResourceAttributes()` - Get all resource attributes
- `getEnvironmentAttributes()` - Get environment attributes
- `evaluateABACPolicy()` - Evaluate ABAC policy
- `evaluateAttributeConditions()` - Evaluate attribute conditions
- `setUserAttribute()` - Set user attribute
- `setResourceAttribute()` - Set resource attribute
- `validateAttributeValue()` - Validate attribute value
- `initializeDefaultAttributes()` - Initialize default attributes

## Attribute Operators

### Comparison Operators
- `equals` / `==` - Exact match
- `not_equals` / `!=` - Not equal
- `greater_than` / `>` - Numeric greater than
- `greater_than_or_equal` / `>=` - Numeric greater than or equal
- `less_than` / `<` - Numeric less than
- `less_than_or_equal` / `<=` - Numeric less than or equal

### Membership Operators
- `in` - Value in list
- `not_in` - Value not in list

### String Operators
- `contains` - String contains substring
- `starts_with` - String starts with
- `ends_with` - String ends with

### Existence Operators
- `exists` - Attribute exists
- `not_exists` - Attribute does not exist

### Logical Operators
- `AND` - All conditions must be true
- `OR` - At least one condition must be true

## Policy Examples

### Example 1: Department-Based Access
```json
{
  "attribute": "user.department",
  "operator": "equals",
  "value": "IT"
}
```

### Example 2: Training Requirement
```json
{
  "operator": "AND",
  "conditions": [
    {
      "attribute": "user.training_completed",
      "operator": "equals",
      "value": "true"
    },
    {
      "attribute": "user.employment_status",
      "operator": "equals",
      "value": "ACTIVE"
    }
  ]
}
```

### Example 3: Sensitivity-Based Access
```json
{
  "operator": "AND",
  "conditions": [
    {
      "attribute": "resource.sensitivity_score",
      "operator": "greater_than",
      "value": "70"
    },
    {
      "attribute": "user.clearance",
      "operator": "in",
      "value": ["CONFIDENTIAL", "RESTRICTED", "TOP_SECRET"]
    },
    {
      "attribute": "environment.is_business_hours",
      "operator": "equals",
      "value": true
    }
  ]
}
```

### Example 4: Contract Type Restriction
```json
{
  "operator": "AND",
  "conditions": [
    {
      "attribute": "user.contract_type",
      "operator": "in",
      "value": ["FULL_TIME", "PART_TIME"]
    },
    {
      "attribute": "resource.owner_department",
      "operator": "equals",
      "value": "user.department"
    }
  ]
}
```

### Example 5: Threat-Based Access
```json
{
  "operator": "AND",
  "conditions": [
    {
      "attribute": "environment.threat_intelligence_score",
      "operator": "less_than",
      "value": "10"
    },
    {
      "attribute": "environment.system_maintenance_status",
      "operator": "not_equals",
      "value": "MAINTENANCE"
    }
  ]
}
```

## Middleware

### ABAC Enforcement (`src/middleware/abac.ts`)

```typescript
enforceABAC(
  request: NextRequest,
  resourceType: string,
  resourceId: string,
  action: string,
  context?: {
    networkSecurityLevel?: string;
    threatIntelligenceScore?: number;
    systemMaintenanceStatus?: string;
  }
): Promise<{ allowed: boolean; response?: NextResponse }>
```

**Usage:**
```typescript
const abacCheck = await enforceABAC(request, "visitor", visitorId, "read", {
  networkSecurityLevel: "HIGH",
  threatIntelligenceScore: 5,
  systemMaintenanceStatus: "OPERATIONAL"
});
if (!abacCheck.allowed) {
  return abacCheck.response;
}
```

## Usage Examples

### Set User Attribute
```typescript
await setUserAttribute(
  userId,
  "training_completed",
  "true",
  "HR_SYSTEM"
);
```

### Set Resource Attribute
```typescript
await setResourceAttribute(
  "visitor",
  visitorId,
  "sensitivity_score",
  "75",
  "AUTO_CALCULATED",
  true
);
```

### Evaluate Policy
```typescript
const result = await evaluateABACPolicy(
  policyId,
  userId,
  "visitor",
  visitorId,
  {
    ipAddress: "192.168.1.100",
    currentTime: new Date(),
    networkSecurityLevel: "HIGH",
    threatIntelligenceScore: 5,
    systemMaintenanceStatus: "OPERATIONAL"
  }
);
```

### Get All Attributes
```typescript
const userAttrs = await getUserAttributes(userId);
const resourceAttrs = await getResourceAttributes("visitor", visitorId);
const envAttrs = await getEnvironmentAttributes({
  ipAddress: "192.168.1.100",
  currentTime: new Date()
});
```

## Security Features

1. **Dynamic Evaluation**: Policies evaluated at access time
2. **Context-Aware**: Considers user, resource, and environment
3. **Fine-Grained**: Attribute-level access control
4. **Flexible Conditions**: Support for complex logical expressions
5. **Value Validation**: Type and constraint checking
6. **Expiration Support**: Time-bound attribute values
7. **Audit Logging**: All attribute changes logged
8. **Priority System**: Policy evaluation order

## Best Practices

1. **Attribute Naming**: Use clear, consistent naming conventions
2. **Value Validation**: Define proper constraints for attributes
3. **Policy Priority**: Set appropriate priorities for policy evaluation
4. **Documentation**: Document all attributes and their purposes
5. **Testing**: Test policies thoroughly before deployment
6. **Monitoring**: Monitor attribute values and policy evaluations
7. **Performance**: Index frequently queried attributes
8. **Security**: Validate all attribute values before storage

## Future Enhancements

- [ ] Attribute inheritance
- [ ] Attribute templates
- [ ] Attribute versioning
- [ ] Machine learning for attribute scoring
- [ ] Real-time attribute updates
- [ ] Attribute analytics and reporting
- [ ] Visual policy builder
- [ ] Policy testing framework
- [ ] Attribute dependency management
- [ ] Integration with external attribute sources



