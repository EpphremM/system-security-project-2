# Phase 2.1: Comprehensive Security Database Schema

## Overview

This document describes the comprehensive PostgreSQL schema designed for a secure visitor management system with multiple access control models (MAC, DAC, RBAC, RuBAC, ABAC), encrypted logging, and advanced security features.

## Schema Architecture

### 1. User Model
**Purpose**: System users (staff, admins) with security attributes

**Key Features**:
- Links to `Role` model for RBAC
- Security clearance levels
- MFA support with WebAuthn
- Session versioning for invalidation
- Legacy role field for backward compatibility

**Security Attributes**:
- `securityClearance`: SecurityLevel enum
- `mfaEnabled`: Multi-factor authentication
- `sessionVersion`: For forced re-authentication
- `passwordChangedAt`: Track password changes

**Relations**:
- `role`: Role-based access (RBAC)
- `permissions`: Direct user permissions (ACL)
- `ownedResources`: Resources owned by user (DAC)
- `sessions`: Active sessions
- `auditLogs`: User activity logs

### 2. Visitor Model
**Purpose**: Visitor records with classification levels

**Key Features**:
- Security classification (`securityLabel`, `dataCategory`)
- Scheduled visit timing
- Approval workflow
- Document storage references

**Security Classification**:
- `securityLabel`: SecurityLevel (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, TOP_SECRET)
- `dataCategory`: DataCategory (GENERAL, PERSONAL, CONFIDENTIAL, RESTRICTED, CLASSIFIED)

### 3. AccessPolicy Model
**Purpose**: Multi-model access control policies (MAC, DAC, RBAC, RuBAC, ABAC)

**Policy Types**:
- **MAC (Mandatory Access Control)**: Security label-based access
  - `minSecurityLabel`: Minimum clearance required
  - `maxSecurityLabel`: Maximum clearance allowed
  
- **DAC (Discretionary Access Control)**: Resource ownership
  - `ownerId`: Resource owner
  - Owner can grant/revoke access
  
- **RBAC (Role-Based Access Control)**: Role-based permissions
  - `requiredRoleId`: Required role for access
  
- **RuBAC (Rule-Based Access Control)**: Time/location-based rules
  - `rules`: JSON conditions (e.g., time windows, locations)
  
- **ABAC (Attribute-Based Access Control)**: Attribute-based conditions
  - `attributes`: JSON conditions (e.g., department, clearance)
  
- **HYBRID**: Combination of multiple models

**Fields**:
- `policyType`: PolicyType enum
- `priority`: Evaluation order (higher = first)
- `conditions`: Additional JSON conditions

### 4. Role Model
**Purpose**: Job roles with hierarchical permissions

**Key Features**:
- **Hierarchical Structure**: Parent-child relationships
- **Permission Inheritance**: Child roles inherit parent permissions
- **Level System**: Numeric level for privilege comparison
- **System Roles**: Protected system roles

**Structure**:
```
Admin (level: 100)
  ├── Security Manager (level: 80)
  │   ├── Security Officer (level: 60)
  └── Department Head (level: 70)
      └── Department Member (level: 50)
```

**Fields**:
- `parentId`: Parent role for hierarchy
- `level`: Numeric privilege level
- `isSystem`: System roles cannot be deleted
- `permissions`: RolePermission relations

### 5. Permission Model
**Purpose**: Access Control Lists (ACL)

**Key Features**:
- Resource-action pairs
- Granular permissions
- Can be assigned to roles or users
- Supports deny permissions

**Structure**:
- `resource`: Resource type (e.g., "visitor", "document")
- `action`: Action type (e.g., "read", "write", "delete")
- Unique constraint on `[resource, action]`

**Relations**:
- `rolePermissions`: Permissions assigned to roles
- `userPermissions`: Direct user permissions

### 6. RolePermission & UserPermission Models
**Purpose**: Link permissions to roles/users

**Key Features**:
- `granted`: Boolean (true = grant, false = deny)
- `conditions`: Additional JSON conditions
- `expiresAt`: Temporary permissions (UserPermission only)

**Use Cases**:
- RolePermission: Permanent role-based permissions
- UserPermission: Direct user permissions or exceptions

### 7. SecurityLabel Model
**Purpose**: Data classification system

**Key Features**:
- Hierarchical label structure
- Numeric level for comparison
- Links to SecurityLevel and DataCategory
- Resources can be labeled

**Structure**:
```
TOP_SECRET (level: 100)
  ├── RESTRICTED (level: 80)
  │   ├── CONFIDENTIAL (level: 60)
  │   │   ├── INTERNAL (level: 40)
  │   │   │   └── PUBLIC (level: 20)
```

**Fields**:
- `level`: Numeric level for comparison
- `classification`: SecurityLevel enum
- `dataCategory`: DataCategory enum
- `parentId`: Parent label for hierarchy

### 8. Resource Model
**Purpose**: Resource ownership and labeling (DAC + MAC)

**Key Features**:
- **DAC**: Resource ownership tracking
- **MAC**: Security label assignment
- Links actual resources (visitors, documents) to access control

**Structure**:
- `type`: Resource type (e.g., "visitor", "document")
- `resourceId`: ID of actual resource
- `ownerId`: Resource owner (DAC)
- `securityLabelId`: Security label (MAC)
- `permissions`: Cached permissions for performance

### 9. AuditLog Model
**Purpose**: Encrypted activity logging

**Key Features**:
- **Encryption**: Sensitive data stored encrypted
- **Compliance**: Retention and tagging
- **Security Classification**: Logs have security labels
- **Geographic Tracking**: Location information

**Fields**:
- `encryptedDetails`: Encrypted JSON (sensitive data)
- `encryptionKeyId`: Reference to encryption key
- `securityLabel`: Security classification
- `retentionUntil`: Compliance retention date
- `complianceTags`: Tags (e.g., "GDPR", "HIPAA")

**Best Practices**:
- Encrypt sensitive data before logging
- Set retention periods based on compliance
- Tag logs for compliance requirements

### 10. Session Model
**Purpose**: Secure session management

**Key Features**:
- Device fingerprinting
- Location tracking
- MFA verification tracking
- Manual revocation support
- Activity monitoring

**Security Features**:
- `deviceFingerprint`: Device identification
- `location`: Geographic location
- `isActive`: Active status
- `revokedAt`: Manual revocation
- `requiresMFA`: MFA requirement flag
- `mfaVerified`: MFA verification status
- `lastActivityAt`: Activity monitoring

### 11. BackupLog Model
**Purpose**: Backup tracking and verification

**Key Features**:
- Multiple backup types (FULL, INCREMENTAL, DIFFERENTIAL)
- Checksum verification
- Encryption support
- Retention management
- Status tracking

**Fields**:
- `backupType`: BackupType enum
- `checksum`: SHA-256 for verification
- `verified`: Verification status
- `encrypted`: Encryption flag
- `encryptionKeyId`: Encryption key reference
- `status`: BackupStatus enum
- `expiresAt`: Retention expiration
- `retentionDays`: Retention period

**Backup Types**:
- `FULL`: Complete backup
- `INCREMENTAL`: Changes since last backup
- `DIFFERENTIAL`: Changes since last full backup
- `MANUAL`: Manual backup
- `SCHEDULED`: Automated scheduled backup

### 12. SystemConfig Model
**Purpose**: Encrypted configuration storage

**Key Features**:
- Encrypted sensitive configuration
- Versioning support
- Access restrictions
- Audit trail

**Fields**:
- `key`: Configuration key (unique)
- `value`: Encrypted value
- `encrypted`: Encryption flag
- `encryptionKeyId`: Encryption key reference
- `encryptionAlgorithm`: Algorithm used (default: AES-256-GCM)
- `sensitive`: Sensitive data flag
- `restricted`: Requires special permission
- `version`: Version number
- `previousValue`: Rollback support
- `updatedBy`: Audit trail

**Best Practices**:
- Encrypt all sensitive configuration
- Use versioning for rollback capability
- Restrict access to sensitive configs
- Track who updated configurations

## Access Control Models

### MAC (Mandatory Access Control)
**Implementation**: SecurityLabel + AccessPolicy

**How it works**:
1. Resources are labeled with SecurityLabel
2. Users have securityClearance
3. AccessPolicy defines min/max security labels
4. Access granted if: `minSecurityLabel <= user.clearance <= maxSecurityLabel`

**Example**:
```prisma
// Policy: Only CONFIDENTIAL+ users can access RESTRICTED documents
AccessPolicy {
  policyType: MAC
  minSecurityLabel: CONFIDENTIAL
  maxSecurityLabel: TOP_SECRET
  resource: "document"
  action: "read"
}
```

### DAC (Discretionary Access Control)
**Implementation**: Resource.ownerId + AccessPolicy

**How it works**:
1. Resources have an owner (User)
2. Owner can grant permissions to others
3. AccessPolicy with policyType: DAC checks ownership

**Example**:
```prisma
// Policy: Resource owner can manage their resources
AccessPolicy {
  policyType: DAC
  ownerId: userId
  resource: "visitor"
  action: "write"
}
```

### RBAC (Role-Based Access Control)
**Implementation**: Role + RolePermission + User.roleId

**How it works**:
1. Users are assigned roles
2. Roles have permissions via RolePermission
3. Hierarchical roles inherit permissions
4. AccessPolicy can require specific roles

**Example**:
```prisma
// Role: Security Officer
Role {
  name: "Security Officer"
  level: 60
  permissions: [
    { resource: "visitor", action: "read" },
    { resource: "visitor", action: "approve" }
  ]
}
```

### RuBAC (Rule-Based Access Control)
**Implementation**: AccessPolicy.rules (JSON)

**How it works**:
1. AccessPolicy has rules in JSON format
2. Rules evaluated at access time
3. Supports time-based, location-based, etc.

**Example**:
```prisma
AccessPolicy {
  policyType: RuBAC
  rules: {
    timeWindow: { start: "09:00", end: "17:00" },
    daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    location: { allowed: ["Building A", "Building B"] }
  }
}
```

### ABAC (Attribute-Based Access Control)
**Implementation**: AccessPolicy.attributes (JSON)

**How it works**:
1. AccessPolicy has attribute conditions
2. Evaluates user/resource attributes
3. Supports complex conditions

**Example**:
```prisma
AccessPolicy {
  policyType: ABAC
  attributes: {
    user: {
      department: "Security",
      clearance: { min: "CONFIDENTIAL" }
    },
    resource: {
      securityLabel: { max: "RESTRICTED" }
    }
  }
}
```

## Security Best Practices

### 1. Encryption
- **AuditLog.encryptedDetails**: Encrypt sensitive audit data
- **SystemConfig.value**: Encrypt all configuration values
- **BackupLog**: Encrypt backups at rest
- Use AES-256-GCM for encryption
- Store encryption keys separately

### 2. Access Control
- Use principle of least privilege
- Implement defense in depth (multiple models)
- Regularly audit permissions
- Use hierarchical roles for scalability

### 3. Session Management
- Track device fingerprints
- Monitor session activity
- Support manual revocation
- Enforce MFA for sensitive operations

### 4. Audit Logging
- Log all sensitive operations
- Encrypt sensitive audit data
- Set appropriate retention periods
- Tag logs for compliance

### 5. Backup Management
- Verify backups with checksums
- Encrypt backups
- Test restore procedures
- Maintain retention policies

## Migration Guide

### Step 1: Generate Migration
```bash
pnpm prisma migrate dev --name phase_2_1_security_schema
```

### Step 2: Create Initial Roles
```typescript
// Seed script
const roles = [
  { name: "Admin", level: 100, isSystem: true },
  { name: "Security Manager", level: 80, parentId: adminId },
  { name: "Security Officer", level: 60, parentId: securityManagerId },
  // ...
];
```

### Step 3: Create Security Labels
```typescript
const labels = [
  { name: "Public", level: 20, classification: "PUBLIC" },
  { name: "Internal", level: 40, classification: "INTERNAL" },
  // ...
];
```

### Step 4: Create Permissions
```typescript
const permissions = [
  { resource: "visitor", action: "read" },
  { resource: "visitor", action: "write" },
  { resource: "visitor", action: "approve" },
  // ...
];
```

### Step 5: Assign Permissions to Roles
```typescript
// Assign permissions to roles
await prisma.rolePermission.createMany({
  data: [
    { roleId: adminRoleId, permissionId: readPermissionId, granted: true },
    // ...
  ]
});
```

## Query Examples

### Check User Permissions
```typescript
// Get user with role and permissions
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    role: {
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    },
    permissions: {
      include: { permission: true }
    }
  }
});
```

### Evaluate Access Policy
```typescript
// Find applicable policies
const policies = await prisma.accessPolicy.findMany({
  where: {
    resource: "visitor",
    action: "read",
    enabled: true,
    OR: [
      { policyType: "RBAC", requiredRoleId: user.roleId },
      { policyType: "DAC", ownerId: user.id },
      { policyType: "MAC", 
        minSecurityLabel: { lte: user.securityClearance },
        maxSecurityLabel: { gte: user.securityClearance }
      }
    ]
  },
  orderBy: { priority: "desc" }
});
```

### Create Encrypted Audit Log
```typescript
const encryptedDetails = encrypt(JSON.stringify(sensitiveData), keyId);

await prisma.auditLog.create({
  data: {
    userId,
    action: "visitor.approved",
    resource: "visitor",
    resourceId: visitorId,
    encryptedDetails,
    encryptionKeyId: keyId,
    securityLabel: "CONFIDENTIAL",
    retentionUntil: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
    complianceTags: ["GDPR"]
  }
});
```

## Compliance Considerations

### GDPR
- Encrypt personal data in audit logs
- Set retention periods
- Support data deletion requests
- Tag logs with "GDPR" compliance tag

### HIPAA
- Encrypt health-related data
- Maintain audit trails
- Restrict access to sensitive data
- Tag logs with "HIPAA" compliance tag

### SOC 2
- Comprehensive audit logging
- Access control enforcement
- Backup verification
- Security monitoring

## Performance Optimization

### Indexes
- All foreign keys indexed
- Composite indexes for common queries
- Full-text search on visitor names
- Time-based indexes for logs

### Caching
- Resource.permissions: Cached permissions
- Role hierarchy: Cache in application
- Policy evaluation: Cache results

### Query Optimization
- Use select to fetch only needed fields
- Paginate large result sets
- Use transactions for multiple operations
- Leverage Prisma Accelerate for connection pooling

## Next Steps

1. **Implement Access Control Logic**: Create service layer for policy evaluation
2. **Encryption Service**: Implement encryption/decryption for sensitive data
3. **Backup Service**: Automated backup with verification
4. **Audit Service**: Centralized audit logging
5. **Role Management UI**: Admin interface for role/permission management
6. **Security Monitoring**: Dashboard for security events
7. **Compliance Reporting**: Generate compliance reports from audit logs




