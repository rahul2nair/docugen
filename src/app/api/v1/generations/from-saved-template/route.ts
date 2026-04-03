import { NextResponse } from "next/server";
import { trackGenerationJobForOwnerKey } from "@/server/api-job-store";
import { hasAccountApiKeyScope, requirePaidPlanForOwnerKey, resolveAccountApiKeyAuth } from "@/server/api-auth";
import { config } from "@/server/config";
import { generationQueue } from "@/server/queue";
import { rateLimitExceededResponse, enforceRateLimits } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";
import { getTemplateByOwnerKey } from "@/server/user-data-store";
import { generationFromSavedTemplateSchema } from "@/server/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const accountApiAuth = await resolveAccountApiKeyAuth(request);
  const clientIp = readRequestIp(request) || "unknown";

  if (!accountApiAuth) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Provide an account API key to generate from a saved template"
        }
      },
      { status: 401 }
    );
  }

  if (!hasAccountApiKeyScope(accountApiAuth, "generations:create")) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "This API key cannot create standard generation jobs"
        }
      },
      { status: 403 }
    );
  }

  if (!hasAccountApiKeyScope(accountApiAuth, "templates:read")) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "This API key cannot read saved templates"
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
      bucket: "generation-write:api-key",
      identifiers: [accountApiAuth.id, accountApiAuth.ownerKey],
      limit: config.rateLimit.apiWriteLimit,
      windowSeconds: config.rateLimit.apiWriteWindowSeconds
    },
    {
      bucket: "generation-write:ip-safety",
      identifiers: [clientIp],
      limit: config.rateLimit.ipSafetyLimit,
      windowSeconds: config.rateLimit.ipSafetyWindowSeconds
    }
  ]);

  if (rateLimitViolation) {
    return rateLimitExceededResponse(
      rateLimitViolation,
      "Generation rate limit exceeded. Wait briefly before queueing more jobs."
    );
  }

  const parsed = generationFromSavedTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid saved-template generation request",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const savedTemplate = await getTemplateByOwnerKey(accountApiAuth.ownerKey, parsed.data.templateId);

  if (!savedTemplate) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Saved template not found"
        }
      },
      { status: 404 }
    );
  }

  const shouldSaveToMyFiles = parsed.data.saveToMyFiles !== false;

  const queuePayload = {
    mode: "template_fill" as const,
    templateSource: {
      type: "inline" as const,
      syntax: "handlebars" as const,
      content: savedTemplate.content
    },
    data: parsed.data.data || {},
    outputs: parsed.data.outputs,
    options: parsed.data.options,
    saveToMyFiles: shouldSaveToMyFiles,
    persistence: {
      ownerKey: accountApiAuth.ownerKey
    }
  };

  const job = await generationQueue.add("generate", queuePayload);
  if (job.id) {
    await trackGenerationJobForOwnerKey(accountApiAuth.ownerKey, String(job.id));
  }

  return NextResponse.json({
    jobId: job.id,
    status: "queued",
    templateId: savedTemplate.id,
    templateName: savedTemplate.name
  });
}
