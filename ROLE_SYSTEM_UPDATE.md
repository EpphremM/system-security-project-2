# Role System Update

## Overview
Updated the backend to use all 10 roles as defined in the frontend role system.

## Changes Made

### 1. Database Schema Update
- Updated `UserRole` enum in `prisma/schema.prisma` to include all 10 roles:
  - VISITOR
  - USER (default)
  - STAFF
  - RECEPTIONIST
  - DEPT_HEAD
  - HR
  - SECURITY
  - IT_ADMIN
  - ADMIN
  - SUPER_ADMIN

### 2. Registration Update
- Updated `/api/auth/register` to set `legacyRole: "USER"` as default for new users
- All new registrations will automatically get the USER role

### 3. Authentication Update
- Updated `src/lib/auth/config.ts` to use `legacyRole` from database
- Session now includes the user's role from `legacyRole` field

### 4. Dashboard Update
- Updated dashboard page to properly check for admin roles
- Admin roles: ADMIN, SUPER_ADMIN, SECURITY, IT_ADMIN, HR
- Regular users see Visitor Dashboard
- Admin users see Security Overview

### 5. Prisma Client Regenerated
- Regenerated Prisma client to include new role enum values

## Role Permissions

### VISITOR (Level 1)
- View own visits only

### USER (Level 2) - Default
- View own visits
- Register visitors

### STAFF (Level 3)
- View own visits
- Register visitors
- View department visits

### RECEPTIONIST (Level 4)
- View all visits
- Check-in/check-out visitors

### DEPT_HEAD (Level 5)
- View department visits
- Approve visitors
- View department reports

### HR (Level 6)
- View all visits
- View personnel data
- Manage users
- View HR reports

### SECURITY (Level 7)
- View all visits
- View security logs
- Manage incidents
- View security reports

### IT_ADMIN (Level 8)
- View all visits
- Manage system
- Manage backups
- View system logs

### ADMIN (Level 9)
- View all visits
- Manage users
- Manage roles
- View all reports
- Manage settings

### SUPER_ADMIN (Level 10)
- All permissions (*)

## Route Access

Routes are filtered by role in the sidebar and enforced in middleware:
- `/dashboard` - All roles
- `/dashboard/visitors` - All roles
- `/dashboard/checkin` - RECEPTIONIST, SECURITY, ADMIN, SUPER_ADMIN, IT_ADMIN
- `/dashboard/security` - SECURITY, ADMIN, SUPER_ADMIN, IT_ADMIN
- `/dashboard/users` - HR, ADMIN, SUPER_ADMIN, IT_ADMIN
- `/dashboard/policies` - ADMIN, SUPER_ADMIN, IT_ADMIN
- `/dashboard/incidents` - SECURITY, ADMIN, SUPER_ADMIN
- `/dashboard/reports` - DEPT_HEAD, HR, SECURITY, ADMIN, SUPER_ADMIN
- `/dashboard/audit` - SECURITY, ADMIN, SUPER_ADMIN, IT_ADMIN
- `/dashboard/backup` - IT_ADMIN, ADMIN, SUPER_ADMIN
- `/dashboard/settings` - ADMIN, SUPER_ADMIN, IT_ADMIN

## Migration Notes

If you have existing users in the database, you may need to:
1. Update their `legacyRole` field to one of the new roles
2. Run a migration to update existing role values

Example SQL:
```sql
-- Update existing users to USER role if they don't have one
UPDATE users SET "legacyRole" = 'USER' WHERE "legacyRole" IS NULL;

-- Or update specific users to new roles
UPDATE users SET "legacyRole" = 'STAFF' WHERE email = 'user@example.com';
```

## Testing

1. Register a new user - should get USER role by default
2. Login and check dashboard - regular users see Visitor Dashboard
3. Check sidebar - menu items filtered by role
4. Try accessing restricted routes - should be blocked if role doesn't have access


