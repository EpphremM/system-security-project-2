# Phase 3.3: Multi-Factor Authentication (MFA)

## Overview

Comprehensive multi-factor authentication system with three methods: Time-based OTP (TOTP), WebAuthn (Biometric/Security Keys), and Email OTP. Includes backup codes and emergency access tokens for account recovery.

## Features Implemented

### 1. Time-based OTP (TOTP) ✅

- **Google Authenticator compatibility**: Uses standard TOTP algorithm (RFC 6238)
- **QR code generation**: Automatic QR code generation for easy setup
- **Backup codes**: 10 single-use backup codes generated on setup
- **Emergency access tokens**: Long-lived tokens (30 days) for account recovery
- **Window-based verification**: Supports clock skew with configurable window

### 2. WebAuthn (Biometric/Security Keys) ✅

- **Security key support**: Full support for Yubikey and other FIDO2/WebAuthn devices
- **Cross-platform**: Works with USB, NFC, and Bluetooth security keys
- **Device management**: Track and manage multiple registered devices
- **Counter tracking**: Prevents replay attacks with device counter
- **User verification**: Optional user verification (PIN/biometric) support

### 3. Email OTP ✅

- **Rate-limited delivery**: Maximum 3 OTPs per 5 minutes per user
- **Code expiration**: 5-minute expiration for security
- **Delivery confirmation**: Email sent with clear instructions
- **Automatic cleanup**: Expired OTPs are automatically cleaned up

## Database Schema

### New Models

#### MFABackupCode
- Stores hashed backup codes for TOTP recovery
- Tracks usage to prevent reuse
- One-time use only

#### MFAEmergencyToken
- Long-lived emergency access tokens (30 days)
- Hashed storage for security
- Tracks usage and expiration

#### MFAEmailOTP
- Stores hashed email OTP codes
- Tracks IP address for security
- Automatic expiration (5 minutes)
- Rate limiting enforced

## API Routes

### MFA Setup

#### `POST /api/auth/mfa/totp/setup`
Generate TOTP secret and QR code URI for setup.

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "uri": "otpauth://totp/...",
  "qrCode": "https://api.qrserver.com/v1/create-qr-code/..."
}
```

#### `POST /api/auth/mfa/totp/verify`
Verify TOTP code and enable MFA.

**Request:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "backupCodes": ["ABC123", "DEF456", ...],
  "message": "TOTP MFA enabled successfully"
}
```

#### `POST /api/auth/mfa/webauthn/register`
Generate WebAuthn registration options.

**Response:**
```json
{
  "options": { ... },
  "challenge": "base64challenge"
}
```

#### `POST /api/auth/mfa/webauthn/verify`
Verify WebAuthn registration and store device.

**Request:**
```json
{
  "response": { ... },
  "challenge": "base64challenge",
  "deviceName": "Yubikey 5"
}
```

#### `POST /api/auth/mfa/email-otp/setup`
Enable email OTP and send verification code.

**Response:**
```json
{
  "success": true,
  "message": "Email OTP sent. Please verify to complete setup."
}
```

### MFA Verification

#### `POST /api/auth/mfa/verify`
Verify MFA during login or setup.

**Request:**
```json
{
  "userId": "user-id",
  "method": "totp",
  "code": "123456"
}
```

**Methods:**
- `totp`: TOTP code from authenticator app
- `backup_code`: Single-use backup code
- `emergency_token`: Emergency access token
- `email_otp`: Email OTP code
- `webauthn`: WebAuthn authentication response

#### `GET /api/auth/mfa/verify?userId=...`
Get WebAuthn authentication options.

### Backup Codes & Emergency Tokens

#### `POST /api/auth/mfa/backup-codes`
Generate new backup codes (replaces existing unused codes).

**Response:**
```json
{
  "success": true,
  "backupCodes": ["ABC123", "DEF456", ...],
  "message": "Backup codes generated successfully"
}
```

#### `GET /api/auth/mfa/backup-codes`
Get count of remaining unused backup codes.

#### `POST /api/auth/mfa/emergency-tokens`
Generate new emergency access token.

**Response:**
```json
{
  "success": true,
  "token": "hex-token",
  "expiresAt": "2024-01-01T00:00:00Z",
  "message": "Emergency token generated successfully"
}
```

#### `GET /api/auth/mfa/emergency-tokens`
List all unused emergency tokens.

### Login with MFA

#### `POST /api/auth/login`
Enhanced login that checks for MFA requirement.

**Response (MFA required):**
```json
{
  "message": "MFA verification required",
  "requiresMFA": true,
  "userId": "user-id",
  "availableMethods": ["totp", "email_otp", "backup_code", "emergency_token", "webauthn"]
}
```

#### `POST /api/auth/login/verify-mfa`
Complete login with MFA verification.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password",
  "method": "totp",
  "code": "123456"
}
```

## Utility Functions

### TOTP (`src/lib/utils/mfa/totp.ts`)

- `generateTOTPSecret()`: Generate new TOTP secret
- `generateTOTPURI()`: Generate QR code URI
- `verifyTOTPCode()`: Verify TOTP code
- `checkTOTPCode()`: Verify with clock skew window
- `generateBackupCodes()`: Generate 10 backup codes
- `hashBackupCode()`: Hash backup code for storage
- `verifyBackupCode()`: Verify backup code
- `generateEmergencyToken()`: Generate emergency token
- `hashEmergencyToken()`: Hash emergency token
- `verifyEmergencyToken()`: Verify emergency token

### WebAuthn (`src/lib/utils/mfa/webauthn.ts`)

- `generateWebAuthnRegistrationOptions()`: Generate registration options
- `verifyWebAuthnRegistration()`: Verify and store device
- `generateWebAuthnAuthenticationOptions()`: Generate auth options
- `verifyWebAuthnAuthentication()`: Verify authentication

### Email OTP (`src/lib/utils/mfa/email-otp.ts`)

- `generateEmailOTPCode()`: Generate 6-digit OTP
- `hashEmailOTPCode()`: Hash OTP for storage
- `verifyEmailOTPCode()`: Verify OTP code
- `sendEmailOTP()`: Send OTP via email (rate-limited)
- `verifyEmailOTP()`: Verify email OTP
- `cleanupExpiredOTPs()`: Clean up expired OTPs

## Security Features

### Rate Limiting
- **Email OTP**: 3 requests per 5 minutes per user
- **Block duration**: 10 minutes if limit exceeded

### Code Expiration
- **Email OTP**: 5 minutes
- **Emergency tokens**: 30 days
- **Backup codes**: No expiration (single-use)

### Storage Security
- All codes and tokens are hashed before storage
- SHA-256 hashing for backup codes and emergency tokens
- Secure credential storage for WebAuthn

### Audit Logging
All MFA events are logged:
- `mfa.totp_enabled`
- `mfa.webauthn_enabled`
- `mfa.email_otp_enabled`
- `mfa.verification_success`
- `mfa.verification_failed`
- `mfa.backup_codes_regenerated`
- `mfa.emergency_token_generated`

## User Interface

### Login Flow
1. User enters email and password
2. If MFA is enabled, user is redirected to `/auth/verify-mfa`
3. User selects MFA method and completes verification
4. Upon successful verification, user is logged in

### MFA Verification Page (`/auth/verify-mfa`)
- Method selection dropdown
- Code input for TOTP, Email OTP, Backup Code, Emergency Token
- WebAuthn button for security key authentication
- Email OTP send button
- Error handling and loading states

## Environment Variables

Required for WebAuthn:
```env
WEBAUTHN_RP_ID="localhost"  # Relying Party ID
WEBAUTHN_RP_NAME="Visitor Management System"  # Relying Party Name
WEBAUTHN_ORIGIN="http://localhost:3000"  # Origin URL
```

Required for Email OTP (already configured):
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@example.com"
```

## Usage Examples

### Setting up TOTP MFA

1. Call `POST /api/auth/mfa/totp/setup` to get secret and QR code
2. User scans QR code with authenticator app
3. User enters code from app
4. Call `POST /api/auth/mfa/totp/verify` with secret and code
5. Save backup codes securely

### Setting up WebAuthn

1. Call `POST /api/auth/mfa/webauthn/register` to get options
2. Use WebAuthn API to create credential
3. Call `POST /api/auth/mfa/webauthn/verify` with response
4. Device is registered and MFA is enabled

### Setting up Email OTP

1. Call `POST /api/auth/mfa/email-otp/setup`
2. User receives email with OTP code
3. User enters code to verify
4. MFA is enabled

### Login with MFA

1. User logs in with email/password
2. If MFA enabled, receive `requiresMFA: true` response
3. User selects MFA method and provides code
4. Call `POST /api/auth/login/verify-mfa` with credentials and MFA code
5. Login completes upon successful verification

## Best Practices

1. **Backup Codes**: Always save backup codes in a secure location
2. **Emergency Tokens**: Generate and store emergency tokens securely
3. **Rate Limiting**: Respect rate limits for email OTP
4. **Device Management**: Regularly review and remove unused WebAuthn devices
5. **Audit Logs**: Monitor MFA verification attempts for suspicious activity

## Future Enhancements

- [ ] SMS OTP support
- [ ] Push notification MFA
- [ ] MFA method preferences
- [ ] Remember device option
- [ ] MFA recovery flow improvements
- [ ] Admin MFA enforcement policies



