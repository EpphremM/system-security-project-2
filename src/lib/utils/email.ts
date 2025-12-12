import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // Gmail uses TLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
}

/**
 * Send verification email with OTP
 */
export async function sendVerificationEmail(
  email: string,
  otp: string,
  name?: string
): Promise<void> {
  await sendEmail(
    email,
    "Verify your email address",
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome${name ? `, ${name}` : ''}!</h1>
        <p style="color: #666; font-size: 16px;">Please verify your email address using the OTP code below:</p>
        <div style="background: #f5f5f5; border: 2px dashed #333; padding: 20px; text-align: center; margin: 20px 0;">
          <h2 style="color: #333; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h2>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't create an account, please ignore this email.</p>
      </div>
    `
  );
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string
): Promise<void> {
  await sendEmail(
    email,
    "Welcome!",
    `
      <h1>Welcome${name ? `, ${name}` : ''}!</h1>
      <p>Your email has been verified. Thank you for joining us!</p>
    `
  );
}

/**
 * Send account recovery email
 */
export async function sendRecoveryEmail(
  email: string,
  token: string,
  name?: string
): Promise<void> {
  const recoveryUrl = `${process.env.NEXTAUTH_URL}/auth/recover-account?token=${token}&email=${encodeURIComponent(email)}`;

  await sendEmail(
    email,
    "Account Recovery",
    `
      <h1>Account Recovery${name ? `, ${name}` : ''}</h1>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <a href="${recoveryUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  );
}

