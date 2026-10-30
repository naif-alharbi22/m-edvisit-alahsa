import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const env = getEnv();
  if (!env.SMTP_HOST) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends an email when SMTP is configured; otherwise logs at debug level.
 * Never throws — email delivery must not break the user-facing request.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    logger.debug("Email skipped (SMTP not configured)", { to: message.to, subject: message.subject });
    return false;
  }
  try {
    await transport.sendMail({ from: getEnv().EMAIL_FROM, ...message });
    return true;
  } catch (err) {
    logger.error("Failed to send email", { err, to: message.to, subject: message.subject });
    return false;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
