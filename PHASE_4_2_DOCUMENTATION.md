# Phase 4.2: Discretionary Access Control (DAC)

## Overview

Implementation of Discretionary Access Control (DAC) allowing resource owners to control access to their resources. Supports permission sharing, ownership transfer, folder hierarchy with inheritance, and secure sharing links.

## Features Implemented

### 1. Ownership Model ✅

- **Creator owns the resource**: Resources are automatically owned by their creator
- **Ownership transfer with approval**: Formal process for transferring ownership
- **Inherited permissions from parent folders**: Child resources inherit permissions from parent

### 2. Permission Types ✅

- **Read**: View resource content
- **Write**: Modify resource content
- **Execute**: Execute/run resource (for scripts, etc.)
- **Delete**: Remove resource
- **Share**: Grant permissions to others

### 3. Sharing Interface ✅

- **User/group search**: Find users to share with
- **Permission level selection**: Choose specific permissions to grant
- **Expiration date setting**: Time-bound permissions
- **Sharing link generation**: Secure links with access controls

## Database Schema

### ResourcePermission Model
```prisma
model ResourcePermission {
  id          String   @id @default(uuid())
  resourceId  String
  userId      String?
  groupId     String?
  
  // Permission types
  canRead     Boolean
  canWrite    Boolean
  canExecute  Boolean
  canDelete   Boolean
  canShare    Boolean
  
  // Time-bound
  expiresAt   DateTime?
  
  // Inheritance
  inherited   Boolean
  inheritedFrom String?
}
```

### OwnershipTransfer Model
```prisma
model OwnershipTransfer {
  id          String   @id @default(uuid())
  resourceId  String
  fromUserId  String
  toUserId    String
  requestedBy String
  approvedBy  String?
  status      TransferStatus
  reason      String?
}
```

### SharingLink Model
```prisma
model SharingLink {
  id          String   @id @default(uuid())
  resourceId  String
  token       String   @unique
  createdBy   String
  
  // Permissions
  canRead     Boolean
  canWrite    Boolean
  canExecute  Boolean
  canDelete   Boolean
  canShare    Boolean
  
  // Controls
  expiresAt   DateTime?
  maxUses     Int?
  useCount    Int
  password    String?
  requireAuth Boolean
  allowedEmails String[]
  allowedDomains String[]
}
```

## API Routes

### Permission Management

#### `POST /api/access/dac/permissions/grant`
Grant permission to user.

**Request:**
```json
{
  "resourceType": "visitor",
  "resourceId": "visitor-uuid",
  "userId": "user-uuid",
  "permissions": {
    "read": true,
    "write": false,
    "execute": false,
    "delete": false,
    "share": false
  },
  "expiresAt": "2025-12-31T00:00:00Z",
  "reason": "Temporary access for project"
}
```

#### `POST /api/access/dac/permissions/revoke`
Revoke permission from user.

**Request:**
```json
{
  "resourceType": "visitor",
  "resourceId": "visitor-uuid",
  "userId": "user-uuid"
}
```

#### `GET /api/access/dac/permissions?resourceType=visitor&resourceId=uuid`
Get all permissions for a resource.

### Ownership Transfer

#### `POST /api/access/dac/ownership/request`
Request ownership transfer.

**Request:**
```json
{
  "resourceType": "visitor",
  "resourceId": "visitor-uuid",
  "toUserId": "user-uuid",
  "reason": "User is leaving the department"
}
```

#### `POST /api/access/dac/ownership/approve`
Approve ownership transfer.

**Request:**
```json
{
  "transferId": "transfer-uuid"
}
```

#### `POST /api/access/dac/ownership/reject`
Reject ownership transfer.

**Request:**
```json
{
  "transferId": "transfer-uuid",
  "reason": "Not appropriate at this time"
}
```

### Sharing Links

#### `POST /api/access/dac/sharing/create`
Create sharing link.

**Request:**
```json
{
  "resourceType": "document",
  "resourceId": "doc-uuid",
  "canRead": true,
  "canWrite": false,
  "expiresAt": "2025-12-31T00:00:00Z",
  "maxUses": 10,
  "password": "optional-password",
  "requireAuth": true,
  "allowedEmails": ["user@example.com"],
  "allowedDomains": ["example.com"],
  "name": "Project Document Link",
  "description": "Link for project team"
}
```

**Response:**
```json
{
  "success": true,
  "link": {
    "id": "link-uuid",
    "token": "base64-token",
    "url": "https://example.com/share/base64-token",
    "canRead": true,
    "canWrite": false,
    "expiresAt": "2025-12-31T00:00:00Z",
    "maxUses": 10
  }
}
```

#### `POST /api/access/dac/sharing/verify`
Verify sharing link access.

**Request:**
```json
{
  "token": "base64-token",
  "password": "optional-password"
}
```

#### `POST /api/access/dac/sharing/revoke`
Revoke sharing link.

**Request:**
```json
{
  "linkId": "link-uuid"
}
```

#### `GET /api/access/dac/sharing?resourceType=document&resourceId=uuid`
Get all sharing links for a resource.

## Utility Functions

### DAC Functions (`src/lib/access/dac.ts`)

- `isResourceOwner()` - Check if user owns resource
- `hasPermission()` - Check if user has specific permission
- `grantPermission()` - Grant permission to user
- `revokePermission()` - Revoke permission from user
- `requestOwnershipTransfer()` - Request ownership transfer
- `approveOwnershipTransfer()` - Approve transfer
- `rejectOwnershipTransfer()` - Reject transfer
- `getResourcePermissions()` - Get all permissions for resource
- `inheritPermissions()` - Inherit permissions from parent

### Sharing Functions (`src/lib/access/sharing.ts`)

- `generateSharingToken()` - Generate unique token
- `createSharingLink()` - Create sharing link with controls
- `verifySharingLink()` - Verify link access
- `useSharingLink()` - Increment use count
- `revokeSharingLink()` - Revoke link
- `getResourceSharingLinks()` - Get all links for resource

## Permission Inheritance

### How It Works

1. **Parent-Child Relationship**: Resources can have a parent resource
2. **Inherited Permissions**: Child resources inherit permissions from parent
3. **Explicit Permissions**: Direct permissions override inherited ones
4. **Cascade**: Permissions flow down the hierarchy

### Example

```
Folder (parent)
  ├─ Document 1 (inherits from Folder)
  ├─ Document 2 (inherits from Folder)
  └─ Subfolder (inherits from Folder)
      └─ Document 3 (inherits from Subfolder and Folder)
```

If user has `read` permission on Folder, they automatically have `read` on all children.

## Sharing Link Controls

### Access Controls

1. **Expiration**: Link expires at specified date/time
2. **Max Uses**: Limit number of times link can be used
3. **Password Protection**: Optional password required
4. **Authentication**: Require user to be logged in
5. **Email Restrictions**: Only allow specific emails
6. **Domain Restrictions**: Only allow specific domains

### Security Features

- Unique tokens (base64url, 32 bytes)
- Password hashing (SHA-256)
- Use tracking (count and last used)
- Automatic expiration checking
- Audit logging

## Usage Examples

### Grant Permission
```typescript
await grantPermission(
  "visitor",
  visitorId,
  userId,
  {
    read: true,
    write: false,
  },
  grantedBy,
  new Date("2025-12-31"),
  "Temporary access"
);
```

### Check Permission
```typescript
const result = await hasPermission(userId, "visitor", visitorId, "read");
if (!result.allowed) {
  throw new Error(result.reason);
}
```

### Create Sharing Link
```typescript
const link = await createSharingLink(
  "document",
  docId,
  userId,
  {
    canRead: true,
    expiresAt: new Date("2025-12-31"),
    maxUses: 10,
    password: "secret123",
    requireAuth: true,
  }
);
```

### Request Ownership Transfer
```typescript
await requestOwnershipTransfer(
  "visitor",
  visitorId,
  newOwnerId,
  requesterId,
  "User is leaving department"
);
```

## Security Features

1. **Owner Privileges**: Owners have all permissions automatically
2. **Share Permission**: Only users with share permission can grant access
3. **Audit Logging**: All permission changes logged
4. **Time-Bound Access**: Permissions can expire
5. **Inheritance Tracking**: Track which permissions are inherited
6. **Transfer Approval**: Ownership transfers require approval
7. **Link Security**: Multiple security controls on sharing links

## Best Practices

1. **Principle of Least Privilege**: Grant minimum permissions needed
2. **Time Limits**: Use expiration dates for temporary access
3. **Regular Reviews**: Review permissions periodically
4. **Documentation**: Document reason for permissions
5. **Inheritance**: Use folder hierarchy for efficient permission management
6. **Link Security**: Use strong passwords and restrictions on sharing links
7. **Audit Trail**: Monitor permission changes and access

## Future Enhancements

- [ ] Group-based permissions
- [ ] Permission templates
- [ ] Bulk permission operations
- [ ] Permission delegation
- [ ] Advanced sharing link analytics
- [ ] Integration with external sharing services
- [ ] Permission expiration notifications
- [ ] Visual permission inheritance tree



