# Phase 4.1: Mandatory Access Control (MAC) - Bell-LaPadula Model

## Overview

Implementation of Mandatory Access Control (MAC) using the Bell-LaPadula security model. This enforces data classification and access control based on security labels, clearance levels, and need-to-know compartments.

## Bell-LaPadula Model Rules

### 1. Simple Security Property (No Read-Up)
A subject at a given security level **cannot read** data at a higher security level.

**Implementation:**
- User clearance level must be >= resource classification level
- User must have access to all resource compartments (need-to-know)

### 2. Star Property (No Write-Down)
A subject at a given security level **cannot write** data to a lower security level.

**Implementation:**
- User cannot write to resources with lower classification
- User must have access to all resource compartments

### 3. Trusted Subject Exceptions
Administrators (trusted subjects) can bypass Bell-LaPadula rules for system management.

**Implementation:**
- `User.trustedSubject` flag
- Trusted subjects can read/write at any level
- Only trusted subjects can declassify resources

## Security Labels

### Levels (Hierarchy)
1. **PUBLIC** (0) - Publicly accessible information
2. **INTERNAL** (1) - Internal company information
3. **CONFIDENTIAL** (2) - Confidential business information
4. **RESTRICTED** (3) - Restricted access information
5. **TOP_SECRET** (4) - Highest classification level

### Categories
- **FINANCIAL** - Financial data and budgets
- **PERSONNEL** - Employee and HR information
- **OPERATIONAL** - Operational processes and procedures
- **VISITOR** - Visitor-related information
- **IT** - IT infrastructure and security
- **LEGAL** - Legal documents and contracts
- **EXECUTIVE** - Executive-level information
- **CUSTOM** - Custom compartments

### Compartments
Compartments enforce need-to-know principle:
- Users must have access to **all** compartments of a resource to access it
- Compartments are department-based or category-based
- Multiple compartments can be assigned to resources and users

## Clearance Assignment

### Role-Based Assignment
- Clearance levels assigned based on user roles
- Higher roles typically have higher clearance
- Clearance can be upgraded or downgraded based on need

### Need-to-Know Principle
- Users only get access to compartments they need
- Compartments are assigned based on job function
- Access is limited to specific departments/categories

### Annual Clearance Reviews
- All clearances must be reviewed annually
- Review date is set 1 year from assignment
- Clearance can be renewed, upgraded, downgraded, or revoked
- System tracks users requiring review (30 days before due)

### Clearance Escalation
- Users can request clearance escalation
- Escalation requests require justification
- Admins review and approve/deny escalations
- All escalation requests are logged

## Access Rules

### Read Access
```typescript
canRead(
  userLevel: SecurityLevel,
  resourceLevel: SecurityLevel,
  userCompartments: string[],
  resourceCompartments: string[],
  trustedSubject: boolean
): boolean
```

**Rules:**
1. User level >= resource level (no read-up)
2. User has all resource compartments (need-to-know)
3. Trusted subjects bypass restrictions

### Write Access
```typescript
canWrite(
  userLevel: SecurityLevel,
  resourceLevel: SecurityLevel,
  userCompartments: string[],
  resourceCompartments: string[],
  trustedSubject: boolean
): boolean
```

**Rules:**
1. User level >= resource level (no write-down)
2. User has all resource compartments
3. Trusted subjects bypass restrictions

### Declassification
```typescript
canDeclassify(
  currentLevel: SecurityLevel,
  targetLevel: SecurityLevel,
  trustedSubject: boolean
): boolean
```

**Rules:**
- Only trusted subjects can declassify
- Can only lower classification (declassify)

### Classification
```typescript
canClassify(
  userLevel: SecurityLevel,
  targetLevel: SecurityLevel,
  trustedSubject: boolean
): boolean
```

**Rules:**
- User level >= target level
- Trusted subjects can classify to any level

## Automatic Classification

### Content-Based Classification
Resources are automatically classified based on content keywords:

```typescript
autoClassifyContent(
  content: string,
  keywords?: Record<SecurityLevel, string[]>
): { level: SecurityLevel; compartments: string[] }
```

**Default Keywords:**
- **PUBLIC**: No keywords (default)
- **INTERNAL**: "internal", "staff", "employee"
- **CONFIDENTIAL**: "confidential", "sensitive", "private"
- **RESTRICTED**: "restricted", "classified", "secret"
- **TOP_SECRET**: "top secret", "highly classified", "compartment"

**Compartment Detection:**
- "financial", "budget", "revenue" → FINANCIAL
- "personnel", "employee", "hr" → PERSONNEL
- "visitor", "guest" → VISITOR
- "operational", "process" → OPERATIONAL

## Database Schema

### UserClearance Model
```prisma
model UserClearance {
  id          String   @id @default(uuid())
  userId      String   @unique
  level       SecurityLevel
  compartments String[]
  assignedAt  DateTime
  assignedBy  String?
  expiresAt   DateTime?
  nextReviewAt DateTime
  status      ClearanceStatus
  escalationRequested Boolean
  escalationReason    String?
  escalationRequestedAt DateTime?
}
```

### ClearanceHistory Model
```prisma
model ClearanceHistory {
  id          String   @id @default(uuid())
  userId      String
  previousLevel SecurityLevel?
  newLevel      SecurityLevel
  previousCompartments String[]
  newCompartments      String[]
  changedBy    String?
  reason       String?
  changeType   ClearanceChangeType
  createdAt    DateTime
}
```

### ClearanceCompartment Model
```prisma
model ClearanceCompartment {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  type        CompartmentType
  users       User[]
  isSystem    Boolean
  enabled     Boolean
}
```

### SecurityLabel Model (Enhanced)
```prisma
model SecurityLabel {
  id          String   @id @default(uuid())
  name        String   @unique
  level       Int
  classification SecurityLevel
  dataCategory   DataCategory
  compartments String[] // NEW: Department-based segregation
  // ... other fields
}
```

## API Routes

### Clearance Management

#### `POST /api/access/clearance/assign`
Assign clearance to user.

**Request:**
```json
{
  "userId": "user-uuid",
  "level": "CONFIDENTIAL",
  "compartments": ["FINANCIAL", "PERSONNEL"],
  "reason": "New role assignment",
  "expiresAt": "2025-12-31T00:00:00Z"
}
```

#### `POST /api/access/clearance/revoke`
Revoke user clearance.

**Request:**
```json
{
  "userId": "user-uuid",
  "reason": "Role change"
}
```

#### `POST /api/access/clearance/escalate`
Request clearance escalation.

**Request:**
```json
{
  "targetLevel": "RESTRICTED",
  "targetCompartments": ["IT", "EXECUTIVE"],
  "reason": "Need access to IT infrastructure data"
}
```

#### `POST /api/access/clearance/review`
Process annual clearance review.

**Request:**
```json
{
  "userId": "user-uuid",
  "approved": true,
  "newLevel": "CONFIDENTIAL",
  "newCompartments": ["FINANCIAL"],
  "notes": "Annual review completed"
}
```

#### `GET /api/access/clearance/review`
Get users requiring clearance review.

**Query Parameters:**
- `daysBeforeDue` (default: 30) - Days before review due date

### Access Control

#### `POST /api/access/mac/check`
Check if user can access resource.

**Request:**
```json
{
  "resourceType": "visitor",
  "resourceId": "visitor-uuid",
  "action": "read",
  "targetLevel": "CONFIDENTIAL",
  "targetCompartments": ["FINANCIAL"]
}
```

**Response:**
```json
{
  "allowed": true
}
```

### Classification

#### `POST /api/access/classify`
Automatically classify resource based on content.

**Request:**
```json
{
  "resourceType": "document",
  "resourceId": "doc-uuid",
  "content": "This is confidential financial information",
  "keywords": {
    "CONFIDENTIAL": ["confidential", "sensitive"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "classification": {
    "level": "CONFIDENTIAL",
    "compartments": ["FINANCIAL"]
  },
  "resource": {
    "id": "resource-uuid",
    "securityLabel": { ... }
  }
}
```

## Utility Functions

### MAC Functions (`src/lib/access/mac.ts`)

- `getSecurityLevelValue()` - Get numeric value for security level
- `canRead()` - Check read access (no read-up)
- `canWrite()` - Check write access (no write-down)
- `canDeclassify()` - Check declassification permission
- `canClassify()` - Check classification permission
- `getUserClearance()` - Get user clearance with compartments
- `checkReadAccess()` - Check read access for resource
- `checkWriteAccess()` - Check write access for resource
- `autoClassifyContent()` - Auto-classify based on content
- `getMinimumRequiredClearance()` - Get minimum clearance for resources

### Clearance Functions (`src/lib/access/clearance.ts`)

- `assignClearance()` - Assign clearance to user
- `revokeClearance()` - Revoke user clearance
- `addCompartment()` - Add compartment to clearance
- `removeCompartment()` - Remove compartment from clearance
- `requestEscalation()` - Request clearance escalation
- `reviewClearance()` - Process annual review
- `getUsersRequiringReview()` - Get users needing review

## Middleware

### MAC Enforcement (`src/middleware/mac.ts`)

```typescript
enforceMAC(
  request: NextRequest,
  resourceType: string,
  resourceId: string,
  action: "read" | "write",
  targetLevel?: string,
  targetCompartments?: string[]
): Promise<{ allowed: boolean; response?: NextResponse }>
```

**Usage in API routes:**
```typescript
const macCheck = await enforceMAC(request, "visitor", visitorId, "read");
if (!macCheck.allowed) {
  return macCheck.response;
}
```

## Usage Examples

### Assign Clearance
```typescript
await assignClearance(
  userId,
  "CONFIDENTIAL",
  ["FINANCIAL", "PERSONNEL"],
  adminUserId,
  "New role assignment",
  new Date("2025-12-31")
);
```

### Check Read Access
```typescript
const result = await checkReadAccess(userId, "visitor", visitorId);
if (!result.allowed) {
  throw new Error(result.reason);
}
```

### Auto-Classify Resource
```typescript
const classification = autoClassifyContent(
  "This document contains confidential financial data"
);
// Returns: { level: "CONFIDENTIAL", compartments: ["FINANCIAL"] }
```

### Enforce MAC in API Route
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get("id");
  
  const macCheck = await enforceMAC(request, "visitor", resourceId, "read");
  if (!macCheck.allowed) {
    return macCheck.response;
  }
  
  // Proceed with resource access
}
```

## Security Features

1. **No Read-Up**: Users cannot access higher classification levels
2. **No Write-Down**: Users cannot write to lower classification levels
3. **Need-to-Know**: Compartment-based access control
4. **Trusted Subjects**: Admin exceptions for system management
5. **Audit Logging**: All clearance changes and access attempts logged
6. **Annual Reviews**: Automatic tracking of clearance review dates
7. **Escalation Process**: Formal process for clearance increases
8. **Automatic Classification**: Content-based classification

## Best Practices

1. **Principle of Least Privilege**: Assign minimum clearance needed
2. **Need-to-Know**: Only grant compartments user needs
3. **Regular Reviews**: Conduct annual clearance reviews
4. **Documentation**: Document all clearance changes
5. **Audit Trail**: Monitor all access attempts and clearance changes
6. **Trusted Subjects**: Limit trusted subject status to admins only
7. **Classification**: Classify resources at creation time
8. **Declassification**: Only trusted subjects can declassify

## Future Enhancements

- [ ] Role-based clearance templates
- [ ] Automatic clearance assignment based on role
- [ ] Compartment inheritance
- [ ] Time-based clearance (temporary access)
- [ ] Clearance delegation
- [ ] Multi-level clearance (multiple levels per user)
- [ ] Clearance expiration notifications
- [ ] Integration with HR systems for automatic updates



