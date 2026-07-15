import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from './env.js';
import { logger } from './logger.js';
import type { UserRole } from '../types/auth.js';

let smtpTransport: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

function getSmtpTransport(): nodemailer.Transporter {
  if (smtpTransport) return smtpTransport;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file.');
  }

  smtpTransport = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
    connectionTimeout: env.SMTP_CONNECTION_TIMEOUT,
    greetingTimeout: env.SMTP_GREETING_TIMEOUT,
    socketTimeout: env.SMTP_SOCKET_TIMEOUT,
  });

  return smtpTransport;
}

function emailTemplate(title: string, bodyHtml: string, ctaUrl?: string, ctaText?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;margin:0 auto;padding:32px 16px;">
    <tr>
      <td style="padding-bottom:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:#16a662;padding:32px 32px 20px;text-align:center;">
              <span style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">VerifyNG</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="font-size:20px;font-weight:600;color:#1a1d23;margin:0 0 12px;">${title}</h1>
              ${bodyHtml}
              ${ctaUrl && ctaText ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
                <tr>
                  <td style="background:#16a662;border-radius:8px;text-align:center;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${ctaText}</a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 24px;text-align:center;">
              <p style="font-size:12px;color:#868c98;margin:0;line-height:1.5;">
                You received this email because you created an account on VerifyNG.<br>
                If you did not create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
        <p style="font-size:11px;color:#a0a5b0;text-align:center;margin:16px 0 0;">&copy; ${new Date().getFullYear()} VerifyNG. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;

  const subject = 'Verify your VerifyNG account';
  const html = emailTemplate(
    'Welcome to VerifyNG',
    `<p style="font-size:14px;color:#4a4f5a;line-height:1.6;margin:0;">Thanks for creating an account! Click the button below to verify your email address and start using VerifyNG.</p>`,
    verifyUrl,
    'Verify Email Address',
  );

  await dispatchEmail(to, subject, html);
}

export async function sendPasswordResetEmail(to: string, token: string, role: UserRole): Promise<void> {
  // role is embedded so the reset-password page can send the user back to
  // the correct login page (buyer/vendor/admin) — this is a fresh browser
  // navigation from the user's email client, so no client-side route state
  // survives the trip; the role must travel in the URL itself.
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}&role=${role}`;

  const subject = 'Reset your VerifyNG password';
  const html = emailTemplate(
    'Password Reset',
    `<p style="font-size:14px;color:#4a4f5a;line-height:1.6;margin:0;">We received a request to reset your password. Click the button below to set a new one. This link expires in 1 hour.</p><p style="font-size:14px;color:#4a4f5a;line-height:1.6;margin:12px 0 0;">If you did not request this, you can safely ignore this email.</p>`,
    resetUrl,
    'Reset Password',
  );

  await dispatchEmail(to, subject, html);
}

export async function sendAdminNotification(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const name = escapeHtml(payload.name);
  const emailAddr = escapeHtml(payload.email);
  const subject = escapeHtml(payload.subject);
  const message = escapeHtml(payload.message).replace(/\n/g, '<br>');

  const htmlContent = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:8px 0;font-size:14px;color:#4a4f5a;"><strong style="color:#1a1d23;">Name:</strong> ${name}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#4a4f5a;"><strong style="color:#1a1d23;">Email:</strong> ${emailAddr}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#4a4f5a;"><strong style="color:#1a1d23;">Subject:</strong> ${subject}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#4a4f5a;"><strong style="color:#1a1d23;">Message:</strong></td></tr>
      <tr><td style="padding:8px 12px;background:#f4f6f8;border-radius:6px;font-size:14px;color:#4a4f5a;line-height:1.6;">${message}</td></tr>
    </table>`;

  const fullHtml = emailTemplate('New Support Message Received', htmlContent);

  const adminEmail = process.env.SMTP_USER || env.BREVO_FROM || env.RESEND_FROM;
  if (!adminEmail) {
    logger.error('Cannot send admin notification: no admin email configured (set SMTP_USER, BREVO_FROM, or RESEND_FROM)');
    return;
  }
  await dispatchEmail(adminEmail, `[VerifyNG Support Request]: ${subject}`, fullHtml);
}

/**
 * Send via whichever provider is configured, in priority order:
 * Brevo (HTTPS API — works on hosts that block outbound SMTP, like Render's
 * free tier) → Resend (needs a verified sending domain) → raw SMTP (fine
 * locally, but unreachable in production on Render).
 */
async function dispatchEmail(to: string, subject: string, html: string): Promise<void> {
  if (env.BREVO_API_KEY) {
    await brevoEmail(to, subject, html);
  } else if (env.RESEND_API_KEY) {
    await resendEmail(to, subject, html);
  } else {
    await smtpEmail(to, subject, html);
  }
}

async function brevoEmail(to: string, subject: string, html: string): Promise<void> {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'VerifyNG', email: env.BREVO_FROM },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Brevo error', errorText);
    throw new Error(`Brevo: ${response.status} ${errorText}`);
  }
}

async function resendEmail(to: string, subject: string, html: string): Promise<void> {
  const client = getResend();
  const from = process.env.RESEND_FROM ?? 'VerifyNG <verifyng@your-domain.com>';

  const { error } = await client.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    logger.error('Resend error', error);
    throw new Error(`Resend: ${error.message}`);
  }
}

async function smtpEmail(to: string, subject: string, html: string): Promise<void> {
  const t = getSmtpTransport();
  await t.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
