# Phase 3.1: User Registration & Verification

## Overview

Secure user registration system with CAPTCHA, email verification, bot prevention, and automated cleanup.

## Features Implemented

### 1. Registration Form
- ✅ Password strength meter with real-time feedback
- ✅ hCaptcha integration
- ✅ Department and role selection
- ✅ Terms of service acceptance
- ✅ Form validation with react-hook-form and zod

### 2. Verification Flow
- ✅ Email verification with secure tokens
- ✅ Rate-limited verification attempts
- ✅ Automatic account cleanup for unverified users
- ✅ Token expiration (24 hours)

### 3. Bot Prevention
- ✅ Behavioral analysis for form submissions
- ✅ IP-based rate limiting
- ✅ Device fingerprinting
- ✅ Time-based submission delays
- ✅ Mouse movement and keystroke tracking

## Components

### API Routes

#### `/api/auth/register` (POST)
Registers a new user with comprehensive security checks.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "department": "IT",
  "roleId": "optional-role-uuid",
  "captchaToken": "hcaptcha-token",
  "termsAccepted": true,
  "formFillTime": 5000,
  "mouseMovements": 50,
  "keystrokes": 30,
  "deviceFingerprint": "abc123..."
}
```

**Security Checks:**
1. Rate limiting (5 attempts per 60 seconds)
2. Behavioral analysis (score-based blocking)
3. CAPTCHA verification
4. Password strength validation (minimum score: 2)
5. Email uniqueness check

**Response:**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "user-uuid"
}
```

#### `/api/auth/verify-email` (POST)
Verifies user email with token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "token": "verification-token"
}
```

**Response:**
```json
{
  "message": "Email verified successfully",
  "verified": true
}
```

#### `/api/auth/cleanup` (POST)
Cleanup job for unverified users and expired tokens.

**Headers:**
```
Authorization: Bearer <CLEANUP_API_KEY>
```

**Response:**
```json
{
  "success": true,
  "deletedTokens": 10,
  "deletedUsers": 5,
  "message": "Cleaned up 10 expired tokens and 5 unverified users"
}
```

### Pages

#### `/auth/register`
Registration form with:
- Real-time password strength meter
- hCaptcha widget
- Behavioral tracking
- Device fingerprinting
- Terms acceptance checkbox

#### `/auth/verify-email`
Email verification page:
- Token input
- Email confirmation
- Success/error handling
- Auto-redirect after verification

### Utilities

#### `bot-prevention.ts`
- Behavioral score calculation
- Rate limiting checks
- Device fingerprinting
- Submission delay calculation

#### `password-strength.ts`
- zxcvbn integration
- Strength scoring (0-4)
- Visual feedback
- Crack time estimation

#### `verification.ts`
- Token generation and storage
- Token verification
- Email verification workflow
- Cleanup functions

#### `email.ts`
- Email sending utilities
- Verification email template
- Welcome email template

## Environment Variables

Add to `.env.local`:

```env
# CAPTCHA (hCaptcha)
NEXT_PUBLIC_HCAPTCHA_SITE_KEY="your-hcaptcha-site-key"
HCAPTCHA_SECRET_KEY="your-hcaptcha-secret-key"

# Cleanup Job
CLEANUP_API_KEY="your-cleanup-api-key"
```

## Setup Instructions

### 1. Get hCaptcha Keys

1. Sign up at https://www.hcaptcha.com/
2. Create a new site
3. Get Site Key and Secret Key
4. Add to `.env.local`

### 2. Configure Email Service

Update `src/lib/utils/email.ts` to integrate with your email provider:

**Option 1: SendGrid**
```bash
pnpm add @sendgrid/mail
```

**Option 2: AWS SES**
```bash
pnpm add @aws-sdk/client-ses
```

**Option 3: Nodemailer**
```bash
pnpm add nodemailer
```

### 3. Set Up Cleanup Job

**Option 1: Cron Job**
```bash
# Add to crontab
0 2 * * * curl -X POST https://your-domain.com/api/auth/cleanup \
  -H "Authorization: Bearer $CLEANUP_API_KEY"
```

**Option 2: Vercel Cron**
Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/auth/cleanup",
    "schedule": "0 2 * * *"
  }]
}
```

**Option 3: Node.js Script**
Create `scripts/cleanup.ts`:
```typescript
import { cleanupUnverifiedUsers, cleanupExpiredTokens } from "@/lib/utils/verification";

async function main() {
  const tokens = await cleanupExpiredTokens();
  const users = await cleanupUnverifiedUsers(7);
  console.log(`Cleaned up ${tokens} tokens and ${users} users`);
}

main();
```

## Security Features

### Behavioral Analysis

The system tracks:
- Form fill time (too fast = suspicious)
- Mouse movements (insufficient = suspicious)
- Keystrokes (insufficient = suspicious)
- User agent (bot patterns)
- Device fingerprint

**Scoring:**
- 0-30: Low risk
- 31-69: Medium risk
- 70-100: High risk (blocked)

### Rate Limiting

- **Registration**: 5 attempts per 60 seconds per IP
- **Verification**: 5 attempts per 60 seconds per IP
- Uses `rate-limiter-flexible` with in-memory storage

### Password Requirements

- Minimum 8 characters
- Strength score >= 2 (fair) required
- Real-time feedback with zxcvbn
- Visual strength indicator

### Token Security

- 32-byte random tokens
- Hashed before storage
- 24-hour expiration
- One-time use (deleted after verification)

## Testing

### Manual Testing

1. **Registration Flow:**
   ```
   1. Navigate to /auth/register
   2. Fill form with valid data
   3. Complete CAPTCHA
   4. Submit form
   5. Check email for verification link
   6. Click link or enter token manually
   7. Verify email is marked as verified
   ```

2. **Bot Prevention:**
   ```
   1. Try submitting form too quickly (< 2 seconds)
   2. Try submitting without mouse movements
   3. Try submitting with bot user agent
   4. Verify all are blocked
   ```

3. **Rate Limiting:**
   ```
   1. Submit registration 6 times rapidly
   2. Verify 6th attempt is rate limited
   3. Wait 60 seconds
   4. Verify can submit again
   ```

### Automated Testing

Create test files:
- `__tests__/registration.test.ts`
- `__tests__/verification.test.ts`
- `__tests__/bot-prevention.test.ts`

## Troubleshooting

### CAPTCHA Not Working
- Check `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is set
- Verify site key matches hCaptcha dashboard
- Check browser console for errors

### Email Not Sending
- Verify email service is configured
- Check email service API keys
- Review email service logs

### Verification Token Invalid
- Check token hasn't expired (24 hours)
- Verify token wasn't already used
- Check database for token existence

### Cleanup Not Running
- Verify `CLEANUP_API_KEY` is set
- Check cron job is configured
- Review API route logs

## Best Practices

1. **Email Service**: Use transactional email service (SendGrid, AWS SES)
2. **Token Storage**: In production, use Redis for token mapping
3. **Rate Limiting**: Use Redis for distributed rate limiting
4. **Monitoring**: Log all registration attempts and verifications
5. **Cleanup**: Run cleanup job daily during low-traffic hours
6. **CAPTCHA**: Use hCaptcha or reCAPTCHA v3 for better UX

## Next Steps

1. Integrate email service (SendGrid/AWS SES)
2. Set up Redis for token storage and rate limiting
3. Configure cleanup cron job
4. Add email templates
5. Implement resend verification email feature
6. Add password reset flow
7. Set up monitoring and alerts




