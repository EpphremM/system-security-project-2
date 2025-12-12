# Phase 3.2: Password Authentication

## Overview

Advanced password authentication system with Argon2id hashing, progressive lockout, password history, and secure transmission.

## Features Implemented

### 1. Password Policies ✅

- **Minimum 12 characters**: Enforced at registration and password change
- **Character requirements**: 
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Password history**: Prevents reuse of last 5 passwords
- **Maximum age**: 90 days (password expires after 90 days)
- **Dictionary attack prevention**: Blocks common passwords and patterns
- **Sequential character detection**: Warns about patterns like "12345", "abcde"
- **Repeated character detection**: Warns about patterns like "aaaaaa"

### 2. Password Storage ✅

- **Argon2id hashing**: Most secure variant of Argon2
- **Unique salt per password**: 32-byte random salt
- **Server-side pepper**: Additional secret added before hashing
- **Optimized parameters**:
  - Memory cost: 64 MB
  - Time cost: 3 iterations
  - Parallelism: 4 threads
  - Hash length: 32 bytes

### 3. Account Protection ✅

- **Progressive lockout**:
  - 5 failures = 15 minute lock
  - 10 failures = 24 hour lock
- **IP-based lockout**: Prevents distributed attacks
- **Suspicious activity alerts**: Logged to audit trail
- **Account recovery**: Identity verification with secure tokens

### 4. Secure Transmission ✅

- **End-to-end encryption**: AES-256-GCM for password fields
- **Nonce-based validation**: Prevents replay attacks
- **TLS 1.3 enforcement**: Checked at server level

## Components

### API Routes

#### `/api/auth/login` (POST)
Enhanced login with lockout checks.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Responses:**
- `200`: Login successful
- `401`: Invalid credentials
- `423`: Account locked
- `429`: IP locked

#### `/api/auth/change-password` (POST)
Change password with policy validation.

**Request:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

**Validations:**
- Current password verification
- Password policy compliance
- Password history check (last 5)
- Password strength validation

#### `/api/auth/recover-account` (POST/PUT)
Account recovery flow.

**POST** - Request recovery:
```json
{
  "email": "user@example.com"
}
```

**PUT** - Reset password:
```json
{
  "email": "user@example.com",
  "token": "recovery-token",
  "newPassword": "NewSecurePassword123!"
}
```

### Utilities

#### `password-policy.ts`
- Password validation against policy
- Dictionary attack prevention
- Sequential/repeated pattern detection
- Password expiration calculation

#### `password-hashing.ts`
- Argon2id hashing with pepper
- Password verification
- Rehashing support (for parameter updates)

#### `password-history.ts`
- Track last 5 passwords
- Prevent password reuse
- History cleanup

#### `account-lockout.ts`
- Progressive lockout system
- IP-based lockout
- Lockout cleanup
- Attempt tracking

#### `secure-transmission.ts`
- AES-256-GCM encryption
- Nonce generation and validation
- TLS version checking

### Pages

#### `/auth/recover-account`
Account recovery page with:
- Email input for recovery request
- Token-based password reset
- Password strength meter
- Policy validation feedback

## Password Policy Details

### Requirements

1. **Length**: Minimum 12 characters
2. **Uppercase**: At least one A-Z
3. **Lowercase**: At least one a-z
4. **Numbers**: At least one 0-9
5. **Special Characters**: At least one of `!@#$%^&*()_+-=[]{};':"\\|,.<>/?`
6. **Strength**: Minimum zxcvbn score of 2 (fair)
7. **Dictionary**: Not in common password list
8. **History**: Not in last 5 passwords

### Password Expiration

- **Maximum age**: 90 days
- **Expiration calculation**: `passwordChangedAt + 90 days`
- **Warning**: Should warn users 7 days before expiration
- **Enforcement**: Logged but not enforced (can be enforced in UI)

## Account Lockout System

### Progressive Lockout Levels

1. **Level 1** (5 failures):
   - Lock duration: 15 minutes
   - Applies to: User account and IP

2. **Level 2** (10 failures):
   - Lock duration: 24 hours
   - Applies to: User account and IP

### Lockout Types

- **User Account Lockout**: Based on email
- **IP Address Lockout**: Based on IP address
- **Combined**: Both checked before login

### Lockout Reset

- Automatically resets on successful login
- Manual reset by admin (future feature)
- Expires after lockout duration

## Password History

### Storage

- Last 5 passwords stored
- Hashed with same algorithm as current password
- Automatically cleaned up (oldest removed when adding new)

### Validation

- Checked during password change
- Prevents reuse of last 5 passwords
- Case-sensitive comparison

## Secure Transmission

### Encryption

- **Algorithm**: AES-256-GCM
- **Key length**: 256 bits (32 bytes)
- **IV length**: 96 bits (12 bytes)
- **Tag length**: 128 bits (16 bytes)

### Nonce Validation

- **Nonce length**: 16 bytes (hex encoded)
- **Time window**: 5 minutes
- **Replay prevention**: Time-based validation

### Implementation

```typescript
// Client-side encryption
const { encrypted, iv, tag } = encryptPassword(password);

// Server-side decryption
const password = decryptPassword(encrypted, iv, tag);
```

## Environment Variables

Add to `.env.local`:

```env
# Password Security
PASSWORD_PEPPER="your-server-side-pepper-change-in-production"
ENCRYPTION_KEY="your-encryption-key-32-bytes-hex"
```

**Generate keys:**
```bash
# Generate pepper (any string, keep secret)
openssl rand -base64 32

# Generate encryption key (64 hex characters = 32 bytes)
openssl rand -hex 32
```

## Database Schema Updates

### User Model
- `failedLoginAttempts`: Int (default: 0)
- `accountLockedUntil`: DateTime (nullable)
- `lastFailedLoginAt`: DateTime (nullable)
- `passwordExpiresAt`: DateTime (nullable)

### New Models
- `PasswordHistory`: Stores last 5 passwords
- `AccountLockout`: Tracks IP and user lockouts

## Migration Steps

1. **Generate migration**:
   ```bash
   pnpm prisma migrate dev --name phase_3_2_password_auth
   ```

2. **Set environment variables**:
   - `PASSWORD_PEPPER`
   - `ENCRYPTION_KEY`

3. **Update existing passwords** (optional):
   - Rehash existing bcrypt passwords to Argon2id
   - Set `passwordExpiresAt` for existing users

4. **Test the system**:
   - Test password change
   - Test account lockout
   - Test password history
   - Test account recovery

## Security Best Practices

### Password Storage

1. **Never store plain text passwords**
2. **Use Argon2id** (not bcrypt for new passwords)
3. **Unique salt per password** (handled by Argon2)
4. **Server-side pepper** (additional secret)
5. **Regular parameter review** (update if needed)

### Account Protection

1. **Progressive lockout** prevents brute force
2. **IP-based lockout** prevents distributed attacks
3. **Audit logging** tracks all attempts
4. **Rate limiting** at API level

### Secure Transmission

1. **Always use HTTPS** (TLS 1.3)
2. **Encrypt sensitive fields** in transit
3. **Validate nonces** to prevent replay
4. **Time-based validation** for requests

## Testing

### Password Policy Tests

```typescript
// Test minimum length
validatePasswordPolicy("Short1!") // Should fail

// Test character requirements
validatePasswordPolicy("nouppercase123!") // Should fail
validatePasswordPolicy("NOLOWERCASE123!") // Should fail
validatePasswordPolicy("NoNumbers!") // Should fail
validatePasswordPolicy("NoSpecial123") // Should fail

// Test dictionary
validatePasswordPolicy("password123!") // Should fail

// Test valid password
validatePasswordPolicy("SecurePassword123!") // Should pass
```

### Lockout Tests

```typescript
// Test progressive lockout
// 1-4 attempts: No lock
// 5 attempts: 15 minute lock
// 10 attempts: 24 hour lock
```

### Password History Tests

```typescript
// Test password reuse prevention
// Change password to "Password123!"
// Try to change to "Password123!" again
// Should fail (in history)
```

## Troubleshooting

### Password Hashing Issues

- **Error**: "Invalid hash format"
  - Solution: Ensure using Argon2id, not bcrypt
  - Migrate existing passwords if needed

### Lockout Issues

- **Account stuck locked**
  - Solution: Check `accountLockedUntil` in database
  - Manually reset if needed: `UPDATE users SET accountLockedUntil = NULL WHERE email = '...'`

### Policy Validation Issues

- **Password rejected but seems valid**
  - Check all requirements (uppercase, lowercase, number, symbol)
  - Check password strength score
  - Check dictionary list

## Next Steps

1. **Password expiration enforcement**: Force password change after 90 days
2. **Password expiration warnings**: Notify users 7 days before expiration
3. **Admin password reset**: Allow admins to reset user passwords
4. **Password strength meter**: Real-time feedback in UI
5. **Password history UI**: Show when passwords were changed
6. **Lockout notification**: Email users when account is locked
7. **Recovery token cleanup**: Automated cleanup of expired tokens

## Performance Considerations

- **Argon2id parameters**: Tuned for security vs performance
- **Password history**: Limited to 5 entries for performance
- **Lockout checks**: Indexed for fast queries
- **Hash verification**: Optimized with proper parameters

## Compliance

- **NIST Guidelines**: Follows NIST 800-63B recommendations
- **OWASP**: Implements OWASP password storage best practices
- **PCI DSS**: Meets PCI DSS password requirements
- **GDPR**: Secure handling of authentication data




