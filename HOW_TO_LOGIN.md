# How to Login with Different Roles

## Step 1: Run the Seed Script

First, you need to create test users with different roles. Run:

```bash
pnpm db:seed
```

Or if `tsx` is not installed:

```bash
npx tsx prisma/seed.ts
```

This will create 10 test users, one for each role.

## Step 2: Login Credentials

After running the seed script, use these credentials to login:

### All Users Use the Same Password:
**Password:** `Email1@gmail`

### User Accounts by Role:

| Role | Email | Password |
|------|------|----------|
| **VISITOR** | visitor@test.com | Email1@gmail |
| **USER** | user@test.com | Email1@gmail |
| **STAFF** | staff@test.com | Email1@gmail |
| **RECEPTIONIST** | receptionist@test.com | Email1@gmail |
| **DEPT_HEAD** | depthead@test.com | Email1@gmail |
| **HR** | hr@test.com | Email1@gmail |
| **SECURITY** | security@test.com | Email1@gmail |
| **IT_ADMIN** | itadmin@test.com | Email1@gmail |
| **ADMIN** | admin@test.com | Email1@gmail |
| **SUPER_ADMIN** | superadmin@test.com | Email1@gmail |

## Step 3: Login

1. Go to `http://localhost:3000/auth/login`
2. Enter one of the emails above
3. Enter password: `Email1@gmail`
4. Click "Login"

## Troubleshooting

### If login fails:

1. **Make sure you ran the seed script:**
   ```bash
   pnpm db:seed
   ```

2. **Check if users exist in database:**
   ```bash
   pnpm db:studio
   ```
   Then check the `users` table.

3. **If users exist but password doesn't work:**
   - The seed script hashes the password automatically
   - Make sure you're using the exact password: `Email1@gmail`
   - Check the console logs when running the seed script

4. **If you get "Account locked" error:**
   - Wait a few minutes and try again
   - Or reset the account lockout in the database

## Updating Existing Users

If you already have users in the database and want to update their roles:

1. Open Prisma Studio:
   ```bash
   pnpm db:studio
   ```

2. Find the user in the `users` table

3. Update the `legacyRole` field to one of:
   - `VISITOR`
   - `USER`
   - `STAFF`
   - `RECEPTIONIST`
   - `DEPT_HEAD`
   - `HR`
   - `SECURITY`
   - `IT_ADMIN`
   - `ADMIN`
   - `SUPER_ADMIN`

4. Save the changes

## Resetting Passwords

If you need to reset a user's password to `Email1@gmail`:

1. The seed script will update existing users' roles, but won't change passwords
2. To reset a password, you'll need to:
   - Delete the user and re-run the seed script, OR
   - Manually update the `passwordHash` in the database (not recommended)

## Notes

- All seed users have their email auto-verified
- The password `Email1@gmail` meets all security requirements:
  - ✅ 12+ characters
  - ✅ Contains uppercase letter
  - ✅ Contains lowercase letters
  - ✅ Contains numbers
  - ✅ Contains special characters
- The seed script will skip users that already exist (won't overwrite them)

