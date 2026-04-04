import { NextResponse } from "next/server";
import { config } from "@/server/config";
import { logError, logInfo, logWarn } from "@/server/logger";
import { resolvePersistenceContext } from "@/server/persistence-context";
import { rateLimitExceededResponse, enforceRateLimits } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";
import { sendSmtpTestEmail } from "@/server/smtp";
import { getSmtpSettingsByOwnerKey } from "@/server/user-data-store";
import { smtpTestSchema } from "@/server/validation";

function paidPersistenceRequiredResponse() {
  return NextResponse.json(
    {
      error: {
        code: "STORAGE_UNAVAILABLE",
        message: "SMTP testing is part of Pro or trial because the saved SMTP configuration is account-backed."
      }
    },
    { status: 503 }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const clientIp = readRequestIp(request) || "unknown";
  const found = await resolvePersistenceContext(token);

  if (!found) {
    logWarn("smtp_test_session_not_found", { token, clientIp });
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  if (!found.hasPaidAccess) {
    logWarn("smtp_test_paid_access_required", {
      ownerKey: found.ownerKey,
      authenticatedUserId: found.authenticatedUserId,
      clientIp
    });
    return paidPersistenceRequiredResponse();
  }

  const rateLimitViolation = await enforceRateLimits([
    {
      bucket: "smtp-test:owner",
      identifiers: [found.ownerKey],
      limit: config.rateLimit.smtpTestPerOwnerLimit,
      windowSeconds: config.rateLimit.smtpTestPerOwnerWindowSeconds
    },
    {
      bucket: "smtp-test:ip-safety",
      identifiers: [clientIp],
      limit: config.rateLimit.smtpTestIpSafetyLimit,
      windowSeconds: config.rateLimit.smtpTestIpSafetyWindowSeconds
    }
  ]);

  if (rateLimitViolation) {
    logWarn("smtp_test_rate_limited", {
      ownerKey: found.ownerKey,
      clientIp,
      bucket: rateLimitViolation.bucket,
      limit: rateLimitViolation.limit,
      retryAfterSeconds: rateLimitViolation.retryAfterSeconds
    });
    return rateLimitExceededResponse(
      rateLimitViolation,
      "SMTP test sending is temporarily rate limited. Try again later."
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    logWarn("smtp_test_invalid_json", { ownerKey: found.ownerKey, clientIp });
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }

  const parsed = smtpTestSchema.safeParse(body);

  if (!parsed.success) {
    logWarn("smtp_test_validation_failed", {
      ownerKey: found.ownerKey,
      clientIp,
      details: parsed.error.flatten()
    });
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
      logWarn("smtp_test_missing_settings", {
        ownerKey: found.ownerKey,
        clientIp
      });
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Save SMTP settings for this session first" } },
        { status: 404 }
      );
    }

    await sendSmtpTestEmail(smtp, parsed.data.to);
    logInfo("smtp_test_sent", {
      ownerKey: found.ownerKey,
      clientIp,
      toDomain: parsed.data.to.split("@")[1] || null
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("smtp_test_failed", error, {
      ownerKey: found.ownerKey,
      clientIp
    });
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