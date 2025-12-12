# Prisma Schema Optimization Guide

## Overview

This schema has been optimized for Next.js 16 with enhanced security, performance, and React 19 compatibility features.

## Key Enhancements

### 1. Prisma Accelerate Integration

The schema is configured to work with Prisma Accelerate for connection pooling and query caching.

**Setup:**
1. Sign up for Prisma Accelerate at https://accelerate.prisma.io
2. Get your Accelerate connection string
3. Add to `.env.local`:
   ```env
   PRISMA_ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=your-api-key"
   DATABASE_URL="postgresql://user:password@localhost:5432/visitor_management"
   DIRECT_URL="postgresql://user:password@localhost:5432/visitor_management"
   ```

**Benefits:**
- Connection pooling (reduces connection overhead)
- Query caching (60s TTL with stale-while-revalidate)
- Global edge network for low latency
- Automatic connection management

### 2. Enhanced User Model

#### New Fields:
- `department` - User's department (required)
- `securityClearance` - Security level (INTERNAL, CONFIDENTIAL, RESTRICTED, TOP_SECRET)
- `mfaSecret` / `mfaEnabled` - Multi-factor authentication support
- `preferredAuthMethod` - PASSWORD, WEBAUTHN, OTP, or SSO
- `sessionVersion` - For session invalidation (increment to force re-login)
- `lastLoginAt` - Track last login time
- `passwordChangedAt` - Track password change history

#### Performance Indexes:
- `@@index([email])` - Fast email lookups
- `@@index([department, role])` - Department/role queries
- `@@index([securityClearance])` - Security-based filtering
- `@@index([preferredAuthMethod])` - Auth method filtering
- `@@index([lastLoginAt])` - Recent activity queries

### 3. WebAuthn Device Support

The `WebAuthnDevice` model enables passwordless authentication:

```prisma
model WebAuthnDevice {
  credentialId    String   @unique
  publicKey       String   @db.Text
  counter         Int      @default(0)
  transports      String[] // ["usb", "nfc", "ble", "internal"]
  deviceName      String?
}
```

**Usage:**
- Store WebAuthn credentials for passwordless login
- Track device usage with `lastUsedAt`
- Support multiple devices per user

### 4. Access Control Models

#### AccessPolicy
Fine-grained access control with conditional rules:
- Resource-based permissions
- Action-based permissions
- JSON conditions for complex rules
- User-specific policies

#### AuditLog
Comprehensive audit trail:
- User actions tracking
- Resource access logging
- IP address and user agent capture
- JSON metadata for flexible logging

### 5. Enhanced Visitor Model

New fields for better visitor management:
- `securityLevel` - Match visitor clearance to areas
- `badgeNumber` - Unique badge identifier
- `photoUrl` - Visitor photo storage

**Full-text Search:**
```prisma
@@fulltext([firstName, lastName, email, company])
```
Enables fast text search across visitor names and details.

### 6. Query Optimization

#### Indexes Added:
- **Visitor**: `checkOutTime`, `expectedArrival`, `badgeNumber`, `securityLevel`
- **Session**: `expires`, `sessionToken` (for fast session lookups)
- **AccessLog**: `action`, `location` (for filtering)
- **VisitorLog**: `action` (for action-based queries)

#### Composite Indexes:
- `[department, role]` - Common query pattern
- `[resource, action]` - Access policy lookups
- `[resource, resourceId]` - Audit log queries

## Migration Steps

### 1. Generate Migration

```bash
pnpm prisma migrate dev --name enhance_user_model
```

### 2. Handle Data Migration

The new `department` field is required. You'll need to:

```sql
-- Set default department for existing users
UPDATE users SET department = 'General' WHERE department IS NULL;
```

### 3. Update Application Code

Update any code that references the old User model:

```typescript
// Old
const user = await prisma.user.findUnique({ where: { email } });

// New - includes department
const user = await prisma.user.findUnique({ 
  where: { email },
  include: { webauthnDevices: true }
});
```

### 4. Session Invalidation

To invalidate all user sessions (e.g., after password change):

```typescript
await prisma.user.update({
  where: { id: userId },
  data: { sessionVersion: { increment: 1 } }
});
```

Then in your auth callback, check session version matches user's current version.

## Performance Tips

### 1. Use Select Statements

Only fetch needed fields:

```typescript
const users = await prisma.user.findMany({
  select: { id: true, email: true, name: true, role: true }
});
```

### 2. Use Pagination

For large datasets:

```typescript
const visitors = await prisma.visitor.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' }
});
```

### 3. Use Full-text Search

```typescript
const visitors = await prisma.visitor.findMany({
  where: {
    OR: [
      { firstName: { contains: searchTerm, mode: 'insensitive' } },
      { lastName: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } }
    ]
  }
});
```

### 4. Batch Operations

Use transactions for multiple operations:

```typescript
await prisma.$transaction([
  prisma.visitor.update({ where: { id }, data: { status: 'CHECKED_IN' } }),
  prisma.visitorLog.create({ data: { visitorId: id, action: 'CHECKED_IN' } })
]);
```

## Security Considerations

1. **Password Hashing**: Always use `bcryptjs` or `argon2` (never store plain text)
2. **MFA Secrets**: Store encrypted MFA secrets
3. **Session Versioning**: Increment on password change or security events
4. **Audit Logging**: Log all sensitive operations
5. **Access Policies**: Implement fine-grained access control

## Next Steps

1. Run migrations: `pnpm db:migrate`
2. Update seed scripts with new fields
3. Implement WebAuthn authentication
4. Set up access policy enforcement
5. Configure Prisma Accelerate (optional but recommended)




