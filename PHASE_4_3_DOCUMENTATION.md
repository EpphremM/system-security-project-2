# Phase 4.3: Role-Based Access Control (RBAC)

## Overview

Implementation of hierarchical Role-Based Access Control (RBAC) system with predefined roles, permission management, role lifecycle management, and automatic deprovisioning.

## Features Implemented

### 1. Predefined Roles ✅

Hierarchical role structure with 7 predefined system roles:

1. **SUPER_ADMIN** (Level 100)
   - Full system control and administration
   - Parent: None (top level)

2. **ADMIN** (Level 90)
   - User and system management
   - Parent: SUPER_ADMIN

3. **HR_MANAGER** (Level 80)
   - Personnel data access and management
   - Parent: ADMIN

4. **DEPARTMENT_HEAD** (Level 70)
   - Department oversight and management
   - Parent: ADMIN

5. **SECURITY_OFFICER** (Level 60)
   - Physical access control and security
   - Parent: ADMIN

6. **STAFF** (Level 50)
   - Regular user access
   - Parent: DEPARTMENT_HEAD

7. **AUDITOR** (Level 40)
   - Read-only audit access
   - Parent: ADMIN

### 2. Permission Management ✅

- **Role-Permission Matrix**: Visual interface showing all roles and permissions
- **Bulk Permission Assignment**: Assign multiple permissions to a role at once
- **Permission Inheritance**: Senior roles automatically get junior role permissions
- **Conflict Resolution**: Deny permissions override grant permissions

### 3. Role Lifecycle ✅

- **Role Request/Approval Workflow**: Formal process for role requests
- **Temporary Role Assignments**: Time-bound role assignments
- **Role Reviews**: Automatic tracking of 6-month review cycles
- **Automatic Deprovisioning**: Expired roles automatically deprovisioned

## Database Schema

### RoleAssignment Model
```prisma
model RoleAssignment {
  id          String   @id @default(uuid())
  userId      String
  roleId      String
  assignedBy  String
  assignedAt  DateTime
  isTemporary Boolean
  expiresAt   DateTime?
  status      AssignmentStatus
  lastReviewedAt DateTime?
  nextReviewAt   DateTime?
  deprovisionedAt DateTime?
}
```

### RoleRequest Model
```prisma
model RoleRequest {
  id          String   @id @default(uuid())
  userId      String
  roleId      String
  requestedBy String
  requestedAt DateTime
  reason      String?
  justification String?
  status      RequestStatus
  approvedBy  String?
  approvedAt  DateTime?
  rejectionReason String?
  isTemporary Boolean
  requestedExpiresAt DateTime?
}
```

### RoleReview Model
```prisma
model RoleReview {
  id          String   @id @default(uuid())
  roleId      String
  assignmentId String?
  reviewedBy  String
  reviewedAt  DateTime
  reviewType  ReviewType
  approved    Boolean
  notes       String?
  recommendations String?
  nextReviewAt DateTime
}
```

## API Routes

### Role Management

#### `POST /api/access/rbac/roles/initialize`
Initialize predefined system roles.

#### `GET /api/access/rbac/roles/matrix`
Get role-permission matrix.

**Response:**
```json
{
  "matrix": [
    {
      "role": {
        "id": "role-uuid",
        "name": "ADMIN",
        "level": 90
      },
      "permissions": [
        {
          "permission": { ... },
          "granted": true
        }
      ]
    }
  ],
  "roles": [ ... ],
  "permissions": [ ... ]
}
```

#### `POST /api/access/rbac/assign`
Assign role to user.

**Request:**
```json
{
  "userId": "user-uuid",
  "roleId": "role-uuid",
  "isTemporary": false,
  "expiresAt": "2025-12-31T00:00:00Z",
  "reason": "New position"
}
```

#### `POST /api/access/rbac/revoke`
Revoke role from user.

**Request:**
```json
{
  "userId": "user-uuid",
  "roleId": "role-uuid",
  "reason": "Role no longer needed"
}
```

### Role Requests

#### `POST /api/access/rbac/request`
Request role assignment.

**Request:**
```json
{
  "roleId": "role-uuid",
  "reason": "Need access for project",
  "justification": "Working on visitor management system",
  "isTemporary": true,
  "requestedExpiresAt": "2025-06-30T00:00:00Z"
}
```

#### `POST /api/access/rbac/request/approve`
Approve role request.

**Request:**
```json
{
  "requestId": "request-uuid",
  "isTemporary": true,
  "expiresAt": "2025-06-30T00:00:00Z"
}
```

#### `POST /api/access/rbac/request/reject`
Reject role request.

**Request:**
```json
{
  "requestId": "request-uuid",
  "rejectionReason": "Insufficient justification"
}
```

### Role Reviews

#### `POST /api/access/rbac/review`
Conduct role review.

**Request:**
```json
{
  "roleId": "role-uuid",
  "approved": true,
  "assignmentId": "assignment-uuid",
  "notes": "User performing well in role",
  "recommendations": "Continue in role",
  "reviewType": "ANNUAL"
}
```

#### `GET /api/access/rbac/review?daysBeforeDue=30`
Get roles requiring review.

### Permission Management

#### `POST /api/access/rbac/permissions/bulk`
Bulk assign permissions to role.

**Request:**
```json
{
  "roleId": "role-uuid",
  "permissionIds": ["perm-uuid-1", "perm-uuid-2"],
  "granted": true,
  "conditions": {}
}
```

### Deprovisioning

#### `POST /api/access/rbac/deprovision`
Deprovision expired roles.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "message": "5 expired role(s) deprovisioned"
}
```

## Utility Functions

### RBAC Functions (`src/lib/access/rbac.ts`)

- `initializePredefinedRoles()` - Initialize system roles
- `getRolePermissions()` - Get all permissions for role (including inherited)
- `getUserPermissions()` - Get all permissions for user (from all roles)
- `userHasPermission()` - Check if user has specific permission
- `assignRole()` - Assign role to user
- `revokeRole()` - Revoke role from user
- `requestRole()` - Request role assignment
- `approveRoleRequest()` - Approve role request
- `rejectRoleRequest()` - Reject role request
- `reviewRole()` - Conduct role review
- `getRolesRequiringReview()` - Get roles needing review
- `deprovisionExpiredRoles()` - Deprovision expired roles
- `bulkAssignPermissions()` - Bulk assign permissions
- `getRolePermissionMatrix()` - Get role-permission matrix

## Permission Inheritance

### How It Works

1. **Hierarchical Structure**: Roles have parent-child relationships
2. **Level System**: Higher level = more privileges
3. **Automatic Inheritance**: Child roles inherit parent permissions
4. **Direct Permissions**: Explicit permissions override inherited
5. **Conflict Resolution**: Deny permissions override grant permissions

### Example

```
SUPER_ADMIN (level: 100)
  └── ADMIN (level: 90)
      ├── HR_MANAGER (level: 80)
      ├── DEPARTMENT_HEAD (level: 70)
      │   └── STAFF (level: 50)
      └── SECURITY_OFFICER (level: 60)
```

If ADMIN has `visitor:read` permission, all child roles inherit it.

## Conflict Resolution

### Rules

1. **Direct Permissions Override Role Permissions**: User-specific permissions take precedence
2. **Deny Overrides Grant**: Deny permissions always win
3. **Higher Level Roles Win**: If user has multiple roles, higher level permissions apply
4. **Most Restrictive Wins**: When in doubt, deny access

### Example

User has:
- Role: STAFF (has `visitor:read`)
- Direct permission: `visitor:read` (denied)

Result: User cannot read visitors (deny wins).

## Role Lifecycle

### 1. Request Phase
- User requests role
- Provides reason and justification
- Can request temporary assignment

### 2. Approval Phase
- Admin reviews request
- Can approve or reject
- Can modify temporary duration

### 3. Assignment Phase
- Role assigned to user
- Next review date set (6 months)
- Status: ACTIVE

### 4. Review Phase
- Automatic tracking of review dates
- Reviews conducted every 6 months
- Can approve, suspend, or revoke

### 5. Deprovisioning Phase
- Expired temporary roles automatically deprovisioned
- Status changed to EXPIRED
- Audit log entry created

## Usage Examples

### Initialize Roles
```typescript
await initializePredefinedRoles();
```

### Assign Role
```typescript
await assignRole(
  userId,
  roleId,
  assignedBy,
  false, // isTemporary
  new Date("2025-12-31"), // expiresAt
  "New position"
);
```

### Request Role
```typescript
await requestRole(
  userId,
  roleId,
  requestedBy,
  "Need access for project",
  "Working on visitor management system",
  true, // isTemporary
  new Date("2025-06-30")
);
```

### Check Permission
```typescript
const hasPermission = await userHasPermission(
  userId,
  "visitor",
  "read"
);
```

### Get Role Matrix
```typescript
const matrix = await getRolePermissionMatrix();
```

### Review Role
```typescript
await reviewRole(
  roleId,
  reviewedBy,
  true, // approved
  assignmentId,
  "User performing well",
  "Continue in role",
  "ANNUAL"
);
```

## Security Features

1. **System Role Protection**: System roles cannot be deleted
2. **Approval Workflow**: All role requests require approval
3. **Audit Logging**: All role changes logged
4. **Time-Bound Access**: Temporary roles automatically expire
5. **Regular Reviews**: 6-month review cycle enforced
6. **Automatic Deprovisioning**: Expired roles automatically removed
7. **Permission Inheritance**: Efficient permission management
8. **Conflict Resolution**: Clear rules for permission conflicts

## Best Practices

1. **Principle of Least Privilege**: Assign minimum roles needed
2. **Regular Reviews**: Conduct reviews every 6 months
3. **Documentation**: Document all role assignments and changes
4. **Temporary Roles**: Use temporary assignments for short-term needs
5. **Audit Trail**: Monitor all role changes
6. **Deprovisioning**: Regularly run deprovisioning process
7. **Permission Matrix**: Use matrix for permission management
8. **Inheritance**: Leverage role hierarchy for efficiency

## Future Enhancements

- [ ] Role templates for common positions
- [ ] Automatic role assignment based on department
- [ ] Role delegation (temporary role transfer)
- [ ] Role expiration notifications
- [ ] Integration with HR systems
- [ ] Role analytics and reporting
- [ ] Visual role hierarchy diagram
- [ ] Role-based dashboards



