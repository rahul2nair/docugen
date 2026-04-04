import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedAccountAccess } from "@/server/account-access";
import { sendEmailViaResend } from "@/server/resend-email";
import { enforceRateLimits, rateLimitExceededResponse } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";

const sendDocumentEmailSchema = z.object({
  recipientEmail: z.string().email("Recipient email must be valid"),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().max(2000).optional(),
  documentName: z.string().trim().max(256),
  documentContent: z.string().or(z.instanceof(Blob))
});

export async function POST(request: Request) {
  // Authentication required
  const { user, ownerKey, hasPaidAccess } = await getAuthenticatedAccountAccess("/api/v1/documents/send");

  if (!hasPaidAccess) {
    return NextResponse.json(
      {
        error: {
          code: "UPGRADE_REQUIRED",
          message: "Send via Templify is a Pro feature. Upgrade to Pro to use this feature."
        }
      },
      { status: 403 }
    );
  }

  // Rate limiting
  const clientIp = readRequestIp(request) || "unknown";
  const rateLimitViolation = await enforceRateLimits([
    {
      bucket: "document-email:user",
      identifiers: [ownerKey],
      limit: 50,
      windowSeconds: 86400 // 50 sends per day per user
    },
    {
      bucket: "document-email:ip",
      identifiers: [clientIp],
      limit: 100,
      windowSeconds: 3600 // 100 sends per hour per IP
    }
  ]);

  if (rateLimitViolation) {
    return rateLimitExceededResponse(
      rateLimitViolation,
      "Too many emails sent. Please try again later."
    );
  }

  const parsed = sendDocumentEmailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  try {
    // Generate HTML content for the email
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Document: ${payload.documentName}</h2>
        ${
          payload.message
            ? `<p>${payload.message.replace(/\n/g, "<br>")}</p>`
            : ""
        }
        <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666;">
          Sent via <strong>Templify</strong> by ${user?.email || "a user"}
        </p>
      </div>
    `;

    const textBody = `
Document: ${payload.documentName}

${payload.message ? payload.message + "\n\n" : ""}

Sent via Templify by ${user?.email || "a user"}
    `.trim();

    await sendEmailViaResend({
      toEmail: payload.recipientEmail,
      subject: payload.subject,
      htmlBody,
      textBody,
      replyTo: user?.email
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send document email:", error);
    return NextResponse.json(
      {
        error: {
          code: "EMAIL_SEND_FAILED",
          message: "Failed to send email. Please try again later."
        }
      },
      { status: 500 }
    );
  }
}
