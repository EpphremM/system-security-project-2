# Phase 5.1: Comprehensive Logging System

## Overview

Implementation of a comprehensive logging system that captures all system and user activities across four main categories: Security, User Activity, System, and Compliance logs.

## Features Implemented

### 1. Log Categories ✅

#### Security Logs
- **Authentication**: Success/failure, lockouts, MFA events
- **Access Control**: Access granted/denied, policy violations
- **Security Config**: Configuration changes, clearance changes, permission changes

#### User Activity Logs
- **Data Access**: Who accessed what, when
- **Data Modifications**: Create, update, delete with before/after states
- **Data Export**: Export events with format and record count
- **Permission Changes**: Grant/revoke permissions
- **Role Assignments**: Role assigned/revoked
- **Ownership Transfer**: Resource ownership changes

#### System Logs
- **Application Events**: Start, stop, errors
- **Backup Operations**: Start, complete, failed, verified
- **Performance Metrics**: System performance data
- **Error Tracking**: Exceptions with stack traces
- **Configuration Changes**: System config modifications

#### Compliance Logs
- **Subject Access Requests**: GDPR, HIPAA requests
- **Data Retention**: Retention policy enforcement
- **Audit Exports**: Export events for compliance
- **Compliance Checks**: GDPR, HIPAA, SOX, PCI-DSS checks

### 2. Enhanced AuditLog Model ✅

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?  // Nullable for system logs
  category    LogCategory
  logType     LogType
  action      String
  resource    String
  resourceId  String?
  securityLabel SecurityLevel
  encryptedDetails String?
  details     Json?
  beforeState Json?    // For data modifications
  afterState  Json?    // For data modifications
  accessGranted Boolean?
  policyId    String?
  policyType  PolicyType?
  denialReason String?
  duration    Int?     // Performance metrics
  performanceMetrics Json?
  errorCode   String?
  errorMessage String?
  stackTrace  String?
  retentionUntil DateTime?
  complianceTags String[]
  subjectRequestId String?
  exportedAt  DateTime?
  exportedBy  String?
  exportFormat String?
  ipAddress   String?
  userAgent   String?
  location    String?
  createdAt   DateTime
}
```

### 3. Logging Utilities ✅

#### Security Logging (`src/lib/logging/security.ts`)
- `logAuthSuccess()` - Authentication success
- `logAuthFailure()` - Authentication failure
- `logAuthLockout()` - Account lockout
- `logMFASuccess()` - MFA verification success
- `logMFAFailure()` - MFA verification failure
- `logAccessDecision()` - Access control decision
- `logPolicyViolation()` - Policy violation
- `logSecurityConfigChange()` - Security config change
- `logClearanceChange()` - Clearance level change
- `logPermissionChange()` - Permission change

#### User Activity Logging (`src/lib/logging/user-activity.ts`)
- `logDataAccess()` - Data access event
- `logDataCreate()` - Data creation
- `logDataUpdate()` - Data update with before/after states
- `logDataDelete()` - Data deletion
- `logDataExport()` - Data export
- `logPermissionGrant()` - Permission granted
- `logPermissionRevoke()` - Permission revoked
- `logRoleAssignment()` - Role assigned
- `logRoleRevocation()` - Role revoked
- `logOwnershipTransfer()` - Ownership transfer

#### System Logging (`src/lib/logging/system.ts`)
- `logAppStart()` - Application start
- `logAppStop()` - Application stop
- `logAppError()` - Application error
- `logBackupStart()` - Backup started
- `logBackupComplete()` - Backup completed
- `logBackupFailed()` - Backup failed
- `logBackupVerified()` - Backup verified
- `logPerformanceMetric()` - Performance metric
- `logException()` - Exception occurred
- `logConfigChange()` - Configuration change

#### Compliance Logging (`src/lib/logging/compliance.ts`)
- `logSubjectAccessRequest()` - Subject access request
- `logDataRetentionEnforced()` - Retention policy enforced
- `logDataDeletedRetention()` - Data deleted due to retention
- `logAuditExport()` - Audit log export
- `logComplianceCheck()` - Compliance check
- `logGDPRRequest()` - GDPR-specific request
- `logHIPAAAudit()` - HIPAA audit event
- `calculateRetentionDate()` - Calculate retention date

### 4. API Routes ✅

#### `POST /api/audit/query`
Query audit logs with filters.

**Request:**
```json
{
  "category": "SECURITY",
  "logType": "AUTH_FAILURE",
  "userId": "user-uuid",
  "resource": "user",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "securityLabel": "INTERNAL",
  "complianceTags": ["GDPR"],
  "accessGranted": false,
  "limit": 100,
  "offset": 0
}
```

**Response:**
```json
{
  "logs": [...],
  "total": 150,
  "limit": 100,
  "offset": 0,
  "hasMore": true
}
```

#### `POST /api/audit/export`
Export audit logs in various formats.

**Request:**
```json
{
  "format": "CSV",
  "category": "USER_ACTIVITY",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "complianceTags": ["GDPR"]
}
```

**Supported Formats:**
- CSV
- JSON
- XML
- PDF (returns JSON for client-side PDF generation)

#### `POST /api/audit/retention/enforce`
Enforce log retention policies (scheduled job).

**Response:**
```json
{
  "success": true,
  "message": "Deleted 50 expired logs",
  "deletedCount": 50
}
```

#### `PUT /api/audit/retention/enforce`
Update retention dates for logs without retention dates.

**Response:**
```json
{
  "success": true,
  "message": "Updated retention dates for 100 logs",
  "updatedCount": 100
}
```

### 5. Log Retention Policies ✅

#### Retention Periods
- **GDPR**: 7 years (2555 days)
- **HIPAA**: 6 years (2190 days)
- **SOX**: 7 years (2555 days)
- **PCI-DSS**: 3 years (1095 days)
- **Security Clearance**: 7 years (2555 days)
- **Data Deletion**: 1 year (365 days)
- **Audit Export**: 7 years (2555 days)
- **Default**: 7 years (2555 days)

#### Automatic Retention
- Logs are automatically assigned retention dates based on compliance tags
- Retention enforcement runs as a scheduled job
- Expired logs are automatically deleted
- Deletion events are logged for compliance

## Usage Examples

### Security Logging
```typescript
// Log authentication success
await logAuthSuccess(userId, "PASSWORD", request);

// Log authentication failure
await logAuthFailure(email, "Invalid password", request);

// Log access decision
await logAccessDecision({
  userId,
  action: "read",
  resource: "visitor",
  resourceId: visitorId,
  accessGranted: true,
  policyId: policyId,
  policyType: "RBAC",
  request,
});
```

### User Activity Logging
```typescript
// Log data access
await logDataAccess(userId, "visitor", visitorId, { action: "view" }, request);

// Log data update with before/after states
await logDataUpdate(
  userId,
  "visitor",
  visitorId,
  { name: "Old Name" },
  { name: "New Name" },
  { reason: "Correction" },
  request
);

// Log data export
await logDataExport(
  userId,
  "visitor",
  [visitorId1, visitorId2],
  "CSV",
  2,
  request
);
```

### System Logging
```typescript
// Log application start
await logAppStart("1.0.0", "production");

// Log backup completion
await logBackupComplete(backupId, 5000, 1024000, 100, "checksum123");

// Log performance metric
await logPerformanceMetric("response_time", 150, "ms", {
  endpoint: "/api/visitors",
});
```

### Compliance Logging
```typescript
// Log subject access request
await logSubjectAccessRequest(
  requestId,
  userId,
  "ACCESS",
  ["personal_data", "contact_info"],
  request
);

// Log audit export
await logAuditExport(
  userId,
  "CSV",
  { start: new Date("2025-01-01"), end: new Date("2025-12-31") },
  { category: "USER_ACTIVITY" },
  100,
  request
);
```

## Log Types

### Security Log Types
- `AUTH_SUCCESS` - Authentication successful
- `AUTH_FAILURE` - Authentication failed
- `AUTH_LOCKOUT` - Account locked
- `MFA_SUCCESS` - MFA verification successful
- `MFA_FAILURE` - MFA verification failed
- `ACCESS_GRANTED` - Access granted
- `ACCESS_DENIED` - Access denied
- `POLICY_VIOLATION` - Policy violation
- `SECURITY_CONFIG_CHANGE` - Security config changed
- `CLEARANCE_CHANGE` - Clearance level changed
- `PERMISSION_CHANGE` - Permission changed

### User Activity Log Types
- `DATA_ACCESS` - Data accessed
- `DATA_CREATE` - Data created
- `DATA_UPDATE` - Data updated
- `DATA_DELETE` - Data deleted
- `DATA_EXPORT` - Data exported
- `PERMISSION_GRANT` - Permission granted
- `PERMISSION_REVOKE` - Permission revoked
- `ROLE_ASSIGNED` - Role assigned
- `ROLE_REVOKED` - Role revoked
- `OWNERSHIP_TRANSFER` - Ownership transferred

### System Log Types
- `APP_START` - Application started
- `APP_STOP` - Application stopped
- `APP_ERROR` - Application error
- `BACKUP_START` - Backup started
- `BACKUP_COMPLETE` - Backup completed
- `BACKUP_FAILED` - Backup failed
- `BACKUP_VERIFIED` - Backup verified
- `PERFORMANCE_METRIC` - Performance metric
- `EXCEPTION` - Exception occurred
- `CONFIG_CHANGE` - Configuration changed

### Compliance Log Types
- `SUBJECT_ACCESS_REQUEST` - Subject access request
- `DATA_RETENTION_ENFORCED` - Retention policy enforced
- `DATA_DELETED_RETENTION` - Data deleted due to retention
- `AUDIT_EXPORT` - Audit log exported
- `COMPLIANCE_CHECK` - Compliance check performed
- `GDPR_REQUEST` - GDPR request
- `HIPAA_AUDIT` - HIPAA audit event

## Security Features

1. **Comprehensive Coverage**: All system and user activities logged
2. **Before/After States**: Data modifications tracked with state changes
3. **Access Control Decisions**: All access decisions logged with policy information
4. **Compliance Tags**: Logs tagged for GDPR, HIPAA, SOX, PCI-DSS compliance
5. **Retention Management**: Automatic retention date calculation and enforcement
6. **Export Tracking**: All audit exports logged for compliance
7. **Encrypted Details**: Sensitive data can be encrypted
8. **Geographic Tracking**: IP address and location tracking

## Best Practices

1. **Log Everything**: Log all security, user, system, and compliance events
2. **Include Context**: Include IP address, user agent, location in logs
3. **Before/After States**: Always log before/after states for modifications
4. **Compliance Tags**: Tag logs with appropriate compliance requirements
5. **Retention Policies**: Set appropriate retention dates based on compliance
6. **Regular Exports**: Export audit logs regularly for compliance
7. **Monitor Logs**: Monitor logs for security incidents
8. **Retention Enforcement**: Run retention enforcement as scheduled job

## Scheduled Jobs

### Retention Enforcement
Run daily to delete expired logs:
```typescript
// Cron: 0 2 * * * (2 AM daily)
await enforceRetentionPolicies();
```

### Retention Date Update
Run weekly to update logs without retention dates:
```typescript
// Cron: 0 3 * * 0 (3 AM Sunday)
await updateRetentionDates();
```

## Future Enhancements

- [ ] Real-time log streaming
- [ ] Log aggregation and analytics
- [ ] Anomaly detection
- [ ] Automated alerting
- [ ] Log visualization dashboard
- [ ] SIEM integration
- [ ] Machine learning for log analysis
- [ ] Log compression and archiving
- [ ] Distributed logging
- [ ] Log correlation and analysis



