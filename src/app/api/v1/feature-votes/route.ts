import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendEmailViaResend } from "@/server/resend-email";
import { config } from "@/server/config";
import { enforceRateLimits, rateLimitExceededResponse } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";

const schema = z.object({
  feature: z.string().trim().min(1).max(120),
  sessionToken: z.string().trim().max(256).optional()
});

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length ? value : null;
}

export async function POST(request: Request) {
  const clientIp = readRequestIp(request) || "unknown";

  const rateLimitViolation = await enforceRateLimits([
    {
      bucket: "feature-vote:ip",
      identifiers: [clientIp],
      limit: 5,
      windowSeconds: 3600
    }
  ]);

  if (rateLimitViolation) {
    return rateLimitExceededResponse(rateLimitViolation, "Too many requests. Try again later.");
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }

  const { feature, sessionToken } = parsed.data;

  // Resolve authenticated user if available
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const toEmail = readRequiredEnv("CONTACT_FORM_TO_EMAIL") || readRequiredEnv("SUPPORT_EMAIL");

  if (toEmail && config.resend.apiKey && config.resend.fromEmail) {
    const lines = [
      `Feature: ${feature}`,
      `User ID: ${user?.id ?? "anonymous"}`,
      `User email: ${user?.email ?? "-"}`,
      `Session token: ${sessionToken ?? "-"}`,
      `IP: ${clientIp}`,
      `Time: ${new Date().toISOString()}`
    ];

    await sendEmailViaResend({
      toEmail,
      subject: `[Templify Feature Vote] ${feature}`,
      textBody: lines.join("\n"),
      htmlBody: `<pre style="font-family:monospace;font-size:14px">${lines.join("\n")}</pre>`
    }).catch((err) => {
      console.warn(`⚠️ Feature vote email failed to send:`, err instanceof Error ? err.message : err);
    });
  } else {
    console.warn(`⚠️ Feature vote received but email not configured (missing CONTACT_FORM_TO_EMAIL or Resend config)`);
  }

  return NextResponse.json({ ok: true });
}
