import { NextResponse } from "next/server";
import { resolvePersistenceContext } from "@/server/persistence-context";
import { sendSmtpTestEmail } from "@/server/smtp";
import { getSmtpSettingsByOwnerKey } from "@/server/user-data-store";
import { smtpTestSchema } from "@/server/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const found = await resolvePersistenceContext(token);

  if (!found) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }

  const parsed = smtpTestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "A valid recipient email is required",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  try {
    const smtp = await getSmtpSettingsByOwnerKey(found.ownerKey);

    if (!smtp) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Save SMTP settings for this session first" } },
        { status: 404 }
      );
    }

    await sendSmtpTestEmail(smtp, parsed.data.to);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SMTP_TEST_FAILED",
          message: error instanceof Error ? error.message : "Unable to send test email"
        }
      },
      { status: 400 }
    );
  }
}