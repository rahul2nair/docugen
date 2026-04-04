import { config } from "@/server/config";

interface SendEmailOptions {
  toEmail: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string;
}

function escapeValue(value: string) {
  return value.replace(/\r?\n/g, " ").trim();
}

export async function sendEmailViaResend(options: SendEmailOptions): Promise<{ messageId: string }> {
  if (!config.resend.apiKey) {
    throw new Error("Resend is not configured. RESEND_API_KEY is missing.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resend.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.resend.fromEmail,
      to: [options.toEmail],
      subject: options.subject,
      html: options.htmlBody,
      ...(options.textBody ? { text: options.textBody } : {}),
      ...(options.replyTo ? { reply_to: escapeValue(options.replyTo) } : {})
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload.message === "string"
      ? payload.message
      : payload && payload.error && typeof payload.error.message === "string"
        ? payload.error.message
        : "Resend email request failed.";
    throw new Error(message);
  }

  return {
    messageId: payload && typeof payload.id === "string" ? payload.id : ""
  };
}