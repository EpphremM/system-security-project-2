# Visitor Model Update Guide

## Overview

The Visitor model has been completely restructured to provide better organization, security classification, and visit scheduling capabilities.

## Key Changes

### 1. Structured Field Organization

The model is now organized into logical sections:
- **Personal info**: firstName, lastName, email, phone, company
- **Visit details**: purpose (enum), hostId
- **Security classification**: securityLabel, dataCategory
- **Visit timing**: scheduledDate, scheduledStart, scheduledEnd, actualCheckIn, actualCheckOut
- **Status tracking**: status (state machine), approvalDate, approvedById
- **Documents**: documentId (encrypted storage reference)

### 2. New Enums

#### VisitPurpose
```typescript
enum VisitPurpose {
  MEETING
  INTERVIEW
  DELIVERY
  MAINTENANCE
  TOUR
  TRAINING
  CONSULTATION
  OTHER
}
```

#### VisitStatus (State Machine)
```typescript
enum VisitStatus {
  PENDING      // Initial state
  APPROVED     // Approved by security/admin
  REJECTED     // Rejected by security/admin
  CHECKED_IN   // Visitor has arrived
  CHECKED_OUT  // Visitor has left
  CANCELLED    // Visit was cancelled
  EXPIRED      // Visit time has passed
  NO_SHOW      // Visitor didn't show up
}
```

#### DataCategory
```typescript
enum DataCategory {
  GENERAL
  PERSONAL
  CONFIDENTIAL
  RESTRICTED
  CLASSIFIED
}
```

### 3. Field Changes

#### Required Fields (Previously Optional)
- `phone` - Now required
- `company` - Now required
- `scheduledDate` - New required field
- `scheduledStart` - New required field
- `scheduledEnd` - New required field

#### Removed Fields
- `idType` - Removed (can be stored in documentId reference)
- `idNumber` - Removed (can be stored in documentId reference)
- `expectedArrival` - Replaced by `scheduledStart`
- `notes` - Removed (can use VisitorLog for notes)
- `badgeNumber` - Removed (can be generated from id)
- `photoUrl` - Removed (can be stored in documentId reference)
- `securityLevel` - Renamed to `securityLabel`

#### New Fields
- `scheduledDate` - Date of the visit
- `scheduledStart` - Scheduled start time
- `scheduledEnd` - Scheduled end time
- `actualCheckIn` - Actual check-in time (replaces checkInTime)
- `actualCheckOut` - Actual check-out time (replaces checkOutTime)
- `approvalDate` - When the visit was approved
- `approvedById` - User who approved the visit
- `documentId` - Reference to encrypted document storage
- `securityLabel` - Security classification (renamed from securityLevel)
- `dataCategory` - Data classification category

### 4. Enhanced Indexing

New optimized indexes for common query patterns:

```prisma
@@index([hostId, status])           // Find visitor by host and status
@@index([scheduledDate])            // Daily visitor queries
@@index([status, scheduledDate])    // Status-based date queries
@@index([securityLabel, createdAt]) // Security-based queries
@@index([approvedById])             // Approval tracking
@@fulltext([firstName, lastName, company]) // Text search
```

### 5. Approval Workflow

The model now supports an approval workflow:

1. **PENDING** - Visit request created
2. **APPROVED** - Approved by security/admin (sets `approvalDate` and `approvedById`)
3. **REJECTED** - Rejected by security/admin
4. **CHECKED_IN** - Visitor arrives (sets `actualCheckIn`)
5. **CHECKED_OUT** - Visitor leaves (sets `actualCheckOut`)
6. **CANCELLED** - Visit cancelled
7. **EXPIRED** - Scheduled time passed
8. **NO_SHOW** - Visitor didn't arrive

## Migration Steps

### 1. Generate Migration

```bash
pnpm prisma migrate dev --name update_visitor_model
```

### 2. Data Migration Script

You'll need to migrate existing data. Here's a sample migration script:

```typescript
// scripts/migrate-visitors.ts
import { prisma } from "@/lib/prisma";

async function migrateVisitors() {
  const visitors = await prisma.visitor.findMany({
    where: {
      // Find visitors that need migration
    },
  });

  for (const visitor of visitors) {
    await prisma.visitor.update({
      where: { id: visitor.id },
      data: {
        // Set required fields
        phone: visitor.phone || "000-000-0000", // Set default if null
        company: visitor.company || "Unknown",
        
        // Migrate timing fields
        scheduledDate: visitor.expectedArrival || visitor.createdAt,
        scheduledStart: visitor.expectedArrival || visitor.createdAt,
        scheduledEnd: visitor.checkOutTime || 
          (visitor.expectedArrival 
            ? new Date(visitor.expectedArrival.getTime() + 2 * 60 * 60 * 1000) // +2 hours
            : new Date(visitor.createdAt.getTime() + 2 * 60 * 60 * 1000)),
        
        actualCheckIn: visitor.checkInTime,
        actualCheckOut: visitor.checkOutTime,
        
        // Migrate security fields
        securityLabel: visitor.securityLevel || "PUBLIC",
        dataCategory: "GENERAL", // Default for existing records
        
        // Migrate purpose
        purpose: "OTHER", // Default, update manually if needed
        
        // Migrate status
        status: visitor.status === "CHECKED_IN" ? "CHECKED_IN" :
                visitor.status === "CHECKED_OUT" ? "CHECKED_OUT" :
                visitor.status === "CANCELLED" ? "CANCELLED" :
                visitor.status === "EXPIRED" ? "EXPIRED" : "PENDING",
      },
    });
  }
}
```

### 3. Update Application Code

#### Update Queries

**Old:**
```typescript
const visitors = await prisma.visitor.findMany({
  where: { status: "PENDING" },
});
```

**New:**
```typescript
const visitors = await prisma.visitor.findMany({
  where: { 
    status: "PENDING",
    scheduledDate: { gte: new Date() }
  },
  include: {
    host: true,
    approvedBy: true,
  }
});
```

#### Update Status Checks

**Old:**
```typescript
if (visitor.status === "CHECKED_IN") {
  // ...
}
```

**New:**
```typescript
if (visitor.status === "CHECKED_IN" && visitor.actualCheckIn) {
  // ...
}
```

### 4. Update Validation

The validation schema has been updated in `src/lib/utils/validation.ts`:

- `phone` is now required
- `company` is now required
- `purpose` is now an enum
- `scheduledDate`, `scheduledStart`, `scheduledEnd` are required
- Removed validation for `idType`, `idNumber`, `expectedArrival`, `notes`

### 5. Update TypeScript Types

Types have been updated in `src/types/index.ts`:
- `VisitorStatus` → `VisitStatus` (with backward compatibility export)
- Added `VisitPurpose` and `DataCategory` types
- Updated `Visitor` interface with new fields

## Breaking Changes

### API Changes

1. **Phone and Company are now required**
   - Update all forms to require these fields
   - Set defaults for existing data during migration

2. **Purpose is now an enum**
   - Update forms to use dropdown/select
   - Map existing string purposes to enum values

3. **Timing fields changed**
   - `expectedArrival` → `scheduledStart`
   - `checkInTime` → `actualCheckIn`
   - `checkOutTime` → `actualCheckOut`
   - Added `scheduledDate`, `scheduledEnd`

4. **Status enum expanded**
   - Added `APPROVED`, `REJECTED`, `NO_SHOW`
   - Update status handling logic

### Database Changes

1. **New required columns**: phone, company, scheduledDate, scheduledStart, scheduledEnd
2. **Removed columns**: idType, idNumber, expectedArrival, notes, badgeNumber, photoUrl
3. **Renamed columns**: securityLevel → securityLabel
4. **New columns**: approvalDate, approvedById, documentId, dataCategory

## Best Practices

### 1. Visit Scheduling

Always validate that `scheduledEnd > scheduledStart`:

```typescript
const visitor = await prisma.visitor.create({
  data: {
    // ...
    scheduledStart: new Date("2024-01-15T10:00:00Z"),
    scheduledEnd: new Date("2024-01-15T12:00:00Z"),
  },
});
```

### 2. Approval Workflow

```typescript
// Approve visit
await prisma.visitor.update({
  where: { id: visitorId },
  data: {
    status: "APPROVED",
    approvalDate: new Date(),
    approvedById: currentUserId,
  },
});
```

### 3. Check-in/Check-out

```typescript
// Check in
await prisma.visitor.update({
  where: { id: visitorId },
  data: {
    status: "CHECKED_IN",
    actualCheckIn: new Date(),
  },
});

// Check out
await prisma.visitor.update({
  where: { id: visitorId },
  data: {
    status: "CHECKED_OUT",
    actualCheckOut: new Date(),
  },
});
```

### 4. Document Storage

Store encrypted documents separately and reference them:

```typescript
// Store document (encrypted)
const documentId = await storeEncryptedDocument(file);

// Link to visitor
await prisma.visitor.update({
  where: { id: visitorId },
  data: { documentId },
});
```

## Testing Checklist

- [ ] Create new visitor with all required fields
- [ ] Update visitor status through state machine
- [ ] Approve/reject visitor
- [ ] Check in visitor
- [ ] Check out visitor
- [ ] Query visitors by host and status
- [ ] Query visitors by scheduled date
- [ ] Full-text search on name/company
- [ ] Filter by security label
- [ ] Handle expired visits
- [ ] Handle no-show visits

## Rollback Plan

If you need to rollback:

1. Restore previous migration:
   ```bash
   pnpm prisma migrate reset
   ```

2. Or create a new migration to restore old structure:
   ```bash
   pnpm prisma migrate dev --name rollback_visitor_model
   ```

## Support

For issues or questions about the new Visitor model, refer to:
- `PRISMA_SCHEMA_GUIDE.md` - General schema documentation
- `SCHEMA_OPTIMIZATION_SUMMARY.md` - Schema optimization details




