import { NextResponse } from "next/server";
import { trackGenerationJobForOwnerKey } from "@/server/api-job-store";
import { hasAccountApiKeyScope, requirePaidPlanForOwnerKey, resolveAccountApiKeyAuth } from "@/server/api-auth";
import { config } from "@/server/config";
import { generationQueue } from "@/server/queue";
import { rateLimitExceededResponse, enforceRateLimits } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";
import { generationRequestSchema } from "@/server/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const accountApiAuth = await resolveAccountApiKeyAuth(request);
  const clientIp = readRequestIp(request) || "unknown";

  if (!accountApiAuth) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Provide an account API key to access inline template generation"
        }
      },
      { status: 401 }
    );
  }

  if (!hasAccountApiKeyScope(accountApiAuth, "generations:create:inline")) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "This API key cannot create inline-template jobs"
        }
      },
      { status: 403 }
    );
  }

  const paidResponse = await requirePaidPlanForOwnerKey(accountApiAuth.ownerKey, "account API access");
  if (paidResponse) {
    return paidResponse;
  }

  const rateLimitViolation = await enforceRateLimits([
    {
      bucket: "generation-inline:api-key",
      identifiers: [accountApiAuth.id, accountApiAuth.ownerKey],
      limit: config.rateLimit.apiWriteLimit,
      windowSeconds: config.rateLimit.apiWriteWindowSeconds
    },
    {
      bucket: "generation-inline:ip-safety",
      identifiers: [clientIp],
      limit: config.rateLimit.ipSafetyLimit,
      windowSeconds: config.rateLimit.ipSafetyWindowSeconds
    }
  ]);

  if (rateLimitViolation) {
    return rateLimitExceededResponse(
      rateLimitViolation,
      "Inline template generation is temporarily rate limited. Try again shortly."
    );
  }

  const payload = {
    mode: "template_fill",
    templateSource: {
      type: "inline",
      syntax: "handlebars",
      content: body?.template?.content
    },
    data: body?.data || {},
    outputs: body?.outputs || ["html"]
  };

  const parsed = generationRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid inline template request",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const job = await generationQueue.add("generate", parsed.data);
  if (job.id) {
    await trackGenerationJobForOwnerKey(accountApiAuth.ownerKey, String(job.id));
  }

  return NextResponse.json({
    jobId: job.id,
    status: "queued"
  });
}
