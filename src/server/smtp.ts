import nodemailer from "nodemailer";
import type { StoredSmtpSettings } from "@/server/user-data-store";

function parsePort(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error("SMTP port must be a valid port number");
  }

  return parsed;
}

export function validateSmtpSettings(config: StoredSmtpSettings) {
  if (!config.host.trim()) {
    throw new Error("SMTP host is required");
  }

  if (!config.username.trim()) {
    throw new Error("SMTP username is required");
  }

  if (!config.password.trim()) {
    throw new Error("SMTP password is required");
  }

  if (!config.fromEmail.trim()) {
    throw new Error("From email is required");
  }

  parsePort(config.port);
}

export async function sendSmtpTestEmail(config: StoredSmtpSettings, to: string) {
  validateSmtpSettings(config);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: parsePort(config.port),
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password
    }
  });

  await transporter.verify();

  const fromName = config.fromName.trim();
  const from = fromName ? `${fromName} <${config.fromEmail}>` : config.fromEmail;

  await transporter.sendMail({
    from,
    to,
    subject: "Templify SMTP test",
    text: "Your Templify SMTP configuration is working.",
    html: "<p>Your <strong>Templify</strong> SMTP configuration is working.</p>"
  });
}