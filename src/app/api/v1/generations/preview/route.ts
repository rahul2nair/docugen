import { NextResponse } from "next/server";
import { hasAccountApiKeyScope, requirePaidPlanForOwnerKey, resolveAccountApiKeyAuth, apiKeyExpiredResponse } from "@/server/api-auth";
import { config } from "@/server/config";
import { rateLimitExceededResponse, enforceRateLimits } from "@/server/rate-limit";
import { renderRequest } from "@/server/render";
import { readRequestIp } from "@/server/request-context";
import { getSessionByToken } from "@/server/session-store";
import { generationRequestSchema } from "@/server/validation";
import { readWorkspaceSessionTokenFromRequest } from "@/server/workspace-session-cookie";

export async function POST(request: Request) {
  const body = await request.json();
  const payload = {
    ...body,
    outputs: ["html"]
  };

  const parsed = generationRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid preview request",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const accountApiAuth = await resolveAccountApiKeyAuth(request);
  const sessionToken = parsed.data.session?.token?.trim() || readWorkspaceSessionTokenFromRequest(request);
  const clientIp = readRequestIp(request) || "unknown";
  if (accountApiAuth && "error" in accountApiAuth) {
    if (accountApiAuth.error === "expired") {
      return apiKeyExpiredResponse();
    }

    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid API key"
        }
      },
      { status: 401 }
    );
  }
  if (!sessionToken && !accountApiAuth) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Provide a workspace session token or an account API key to render previews"
        }
      },
      { status: 401 }
    );
  }

  if (!sessionToken && accountApiAuth && !hasAccountApiKeyScope(accountApiAuth, "generations:create")) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "This API key cannot render document previews"
        }
      },
      { status: 403 }
    );
  }

  if (accountApiAuth) {
    const paidResponse = await requirePaidPlanForOwnerKey(accountApiAuth.ownerKey, "account API access");
    if (paidResponse) {
      return paidResponse;
    }
  }

  if (sessionToken && !accountApiAuth) {
    const existingSession = await getSessionByToken(sessionToken);
    if (!existingSession) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "The supplied workspace session token is invalid or expired"
          }
        },
        { status: 401 }
      );
    }
  }

  const rateLimitViolation = await enforceRateLimits(
    accountApiAuth
      ? [
          {
            bucket: "generation-preview:api-key",
            identifiers: [accountApiAuth.id, accountApiAuth.ownerKey],
            limit: config.rateLimit.apiReadLimit,
            windowSeconds: config.rateLimit.apiReadWindowSeconds
          },
          {
            bucket: "generation-preview:ip-safety",
            identifiers: [clientIp],
            limit: config.rateLimit.ipSafetyLimit,
            windowSeconds: config.rateLimit.ipSafetyWindowSeconds
          }
        ]
      : [
          {
            bucket: "generation-preview:session",
            identifiers: [sessionToken, clientIp],
            limit: config.rateLimit.anonymousReadLimit,
            windowSeconds: config.rateLimit.anonymousReadWindowSeconds
          }
        ]
  );

  if (rateLimitViolation) {
    return rateLimitExceededResponse(
      rateLimitViolation,
      "Preview rate limit exceeded. Wait briefly before refreshing the preview again."
    );
  }

  try {
    const result = await renderRequest(parsed.data);
    return new NextResponse(result.html || "", {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "PREVIEW_FAILED",
          message: error instanceof Error ? error.message : "Unable to render preview"
        }
      },
      { status: 500 }
    );
  }
}