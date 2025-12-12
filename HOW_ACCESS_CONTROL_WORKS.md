# How Unified Access Control Works

## Overview

The system uses **5 authorization mechanisms** that work together. All checks must pass for access to be granted.

## The 5 Mechanisms

### 1. **RBAC (Role-Based Access Control)**
- **What it checks**: User's role (USER, ADMIN, SECURITY, etc.)
- **How it works**: 
  - Checks if role can access the route
  - Checks if role has the required permission
  - Example: Only ADMIN can access `/dashboard/users`

### 2. **MAC (Mandatory Access Control)**
- **What it checks**: Security clearance level
- **How it works**:
  - User must have clearance >= resource classification
  - User must have access to all resource compartments
  - Example: User with INTERNAL clearance cannot read CONFIDENTIAL data

### 3. **DAC (Discretionary Access Control)**
- **What it checks**: Resource ownership and sharing
- **How it works**:
  - Owner has full access
  - Shared users have permissions set by owner
  - Example: Only owner or shared users can view a visitor record

### 4. **RuBAC (Rule-Based Access Control)**
- **What it checks**: Time, location, device rules
- **How it works**:
  - Time: Only 9am-5pm access
  - Location: Only from office IP
  - Device: Only company-managed devices
  - Example: Access blocked outside business hours

### 5. **ABAC (Attribute-Based Access Control)**
- **What it checks**: User/resource/environment attributes
- **How it works**:
  - Evaluates policies based on attributes
  - Example: "HR department + Manager role = access salary data"

## How They Work Together

```
User Request
    ↓
1. RBAC Check → Is user role allowed? → NO → ❌ DENY
    ↓ YES
2. MAC Check → Is clearance sufficient? → NO → ❌ DENY
    ↓ YES
3. DAC Check → Does user own/have permission? → NO → ❌ DENY
    ↓ YES
4. RuBAC Check → Do rules allow access? → NO → ❌ DENY
    ↓ YES
5. ABAC Check → Do attributes match policy? → NO → ❌ DENY
    ↓ YES
✅ ACCESS GRANTED
```

## Usage in API Routes

```typescript
import { checkAccess } from "@/lib/access/unified-access-control";

// Simple: Only check role
const result = await checkAccess(request, {
  resourceType: "visitor",
  resourceId: "123",
  action: "read",
  routePath: "/dashboard/visitors",
  requiredPermission: "view_own_visits",
  checkRBAC: true,
  checkMAC: false,
  checkDAC: false,
  checkRuBAC: false,
  checkABAC: false,
});

if (!result.allowed) {
  return result.response; // Returns 403 with error
}

// Full: Check everything
const fullCheck = await checkAccess(request, {
  resourceType: "visitor",
  resourceId: "123",
  action: "read",
  routePath: "/dashboard/visitors",
  requiredPermission: "view_own_visits",
  checkRBAC: true,  // Check role
  checkMAC: true,   // Check clearance
  checkDAC: true,   // Check ownership
  checkRuBAC: true, // Check rules
  checkABAC: true,  // Check attributes
});
```

## Role Permissions

| Role | Permissions |
|------|-------------|
| **VISITOR** | view_own_visits |
| **USER** | view_own_visits, register_visitor |
| **STAFF** | view_own_visits, register_visitor, view_department_visits |
| **RECEPTIONIST** | view_all_visits, check_in_visitor, check_out_visitor |
| **DEPT_HEAD** | view_department_visits, approve_visitor, view_department_reports |
| **HR** | view_all_visits, view_personnel_data, manage_users, view_hr_reports |
| **SECURITY** | view_all_visits, view_security_logs, manage_incidents, view_security_reports |
| **IT_ADMIN** | view_all_visits, manage_system, manage_backups, view_system_logs |
| **ADMIN** | view_all_visits, manage_users, manage_roles, view_all_reports, manage_settings |
| **SUPER_ADMIN** | * (all permissions) |

## Security Clearance Levels (MAC)

1. **PUBLIC** (0) - Anyone can access
2. **INTERNAL** (1) - Internal company info
3. **CONFIDENTIAL** (2) - Confidential business info
4. **RESTRICTED** (3) - Restricted access
5. **TOP_SECRET** (4) - Highest classification

**Rule**: User clearance must be >= resource level to read it.

## Key Points

1. **All checks are independent** - Each mechanism can be enabled/disabled
2. **All must pass** - If any check fails, access is denied
3. **Order matters** - RBAC is checked first (fastest), then MAC, DAC, RuBAC, ABAC
4. **Graceful degradation** - If a check fails, it returns a clear error message
5. **Flexible** - You can use just RBAC for simple routes, or all 5 for sensitive data

