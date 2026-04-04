import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmailViaResend } from "@/server/resend-email";
import { config } from "@/server/config";
import { rateLimitExceededResponse, enforceRateLimits } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  company: z.string().trim().max(160).optional(),
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(10).max(4000)
});

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length ? value : null;
}

export async function POST(request: Request) {
  const clientIp = readRequestIp(request) || "unknown";
  const rateLimitViolation = await enforceRateLimits([
    {
      bucket: "contact-form:ip",
      identifiers: [clientIp],
      limit: Math.min(config.rateLimit.anonymousWriteLimit, 10),
      windowSeconds: Math.max(60, Math.min(config.rateLimit.anonymousWriteWindowSeconds, 3600))
    }
  ]);

  if (rateLimitViolation) {
    return rateLimitExceededResponse(
      rateLimitViolation,
      "Too many contact requests from this network. Try again shortly."
    );
  }

  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid contact form payload",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const toEmail = readRequiredEnv("CONTACT_FORM_TO_EMAIL") || readRequiredEnv("SUPPORT_EMAIL");

  if (!toEmail || !config.resend.apiKey || !config.resend.fromEmail) {
    return NextResponse.json(
      {
        error: {
          code: "CONTACT_NOT_CONFIGURED",
          message: "Contact form email delivery is not configured"
        }
      },
      { status: 503 }
    );
  }

  const payload = parsed.data;

  await sendEmailViaResend({
    toEmail,
    replyTo: payload.email,
    subject: `[Templify Contact] ${payload.subject}`,
    textBody: [
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      `Company: ${payload.company || "-"}`,
      "",
      payload.message
    ].join("\n"),
    htmlBody: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
        <h2 style="margin:0 0 12px;">New Contact Form Submission</h2>
        <p style="margin:0 0 4px;"><strong>Name:</strong> ${payload.name}</p>
        <p style="margin:0 0 4px;"><strong>Email:</strong> ${payload.email}</p>
        <p style="margin:0 0 12px;"><strong>Company:</strong> ${payload.company || "-"}</p>
        <p style="white-space:pre-line;margin:0;">${payload.message
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</p>
      </div>
    `
  });

  return NextResponse.json({ ok: true });
}
