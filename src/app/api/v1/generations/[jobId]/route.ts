import { NextResponse } from "next/server";
import { getGenerationJobOwnerKey } from "@/server/api-job-store";
import { hasAccountApiKeyScope, requirePaidPlanForOwnerKey, resolveAccountApiKeyAuth } from "@/server/api-auth";
import { config } from "@/server/config";
import { getAuthenticatedOwnerKey } from "@/server/persistence-context";
import { generationQueue } from "@/server/queue";
import { rateLimitExceededResponse, enforceRateLimits } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";
import { getGeneratedFileByJobId } from "@/server/user-data-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const persistedFile = await getGeneratedFileByJobId(jobId);
  const requiredOwnerKey = persistedFile?.ownerKey || await getGenerationJobOwnerKey(jobId);
  const clientIp = readRequestIp(request) || "unknown";
  const authenticatedOwnerKey = requiredOwnerKey ? await getAuthenticatedOwnerKey() : null;
  const hasSignedInOwnerAccess = Boolean(requiredOwnerKey && authenticatedOwnerKey === requiredOwnerKey);

  if (requiredOwnerKey && !hasSignedInOwnerAccess) {
    const accountApiAuth = await resolveAccountApiKeyAuth(request);

    if (!accountApiAuth) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Provide an account API key to inspect this job" } },
        { status: 401 }
      );
    }

    if (accountApiAuth.ownerKey !== requiredOwnerKey) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "This API key cannot access the requested job" } },
        { status: 403 }
      );
    }

    if (!hasAccountApiKeyScope(accountApiAuth, "generations:read")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "This API key cannot read job status" } },
        { status: 403 }
      );
    }

    const paidResponse = await requirePaidPlanForOwnerKey(accountApiAuth.ownerKey, "account API access");
    if (paidResponse) {
      return paidResponse;
    }

    const rateLimitViolation = await enforceRateLimits([
      {
        bucket: "generation-read:api-key",
        identifiers: [accountApiAuth.id, accountApiAuth.ownerKey],
        limit: config.rateLimit.apiReadLimit,
        windowSeconds: config.rateLimit.apiReadWindowSeconds
      },
      {
        bucket: "generation-read:ip-safety",
        identifiers: [clientIp],
        limit: config.rateLimit.ipSafetyLimit,
        windowSeconds: config.rateLimit.ipSafetyWindowSeconds
      }
    ]);

    if (rateLimitViolation) {
      return rateLimitExceededResponse(
        rateLimitViolation,
        "Job status polling is temporarily rate limited. Try again shortly."
      );
    }
  } else if (requiredOwnerKey && hasSignedInOwnerAccess) {
    const rateLimitViolation = await enforceRateLimits([
      {
        bucket: "generation-read:signed-in-user",
        identifiers: [authenticatedOwnerKey || clientIp, clientIp],
        limit: config.rateLimit.apiReadLimit,
        windowSeconds: config.rateLimit.apiReadWindowSeconds
      }
    ]);

    if (rateLimitViolation) {
      return rateLimitExceededResponse(
        rateLimitViolation,
        "Job status polling is temporarily rate limited. Try again shortly."
      );
    }
  } else {
    const rateLimitViolation = await enforceRateLimits([
      {
        bucket: "generation-read:anonymous-ip",
        identifiers: [clientIp],
        limit: config.rateLimit.anonymousReadLimit,
        windowSeconds: config.rateLimit.anonymousReadWindowSeconds
      }
    ]);

    if (rateLimitViolation) {
      return rateLimitExceededResponse(
        rateLimitViolation,
        "Job status polling is temporarily rate limited. Try again shortly."
      );
    }
  }

  try {
    const job = await generationQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Job not found" } },
        { status: 404 }
      );
    }

    const state = await job.getState();

    return NextResponse.json({
      jobId,
      status: state,
      result: state === "completed" ? job.returnvalue : undefined,
      error:
        state === "failed"
          ? {
              code: "RENDER_ERROR",
              message: job.failedReason || "Generation failed"
            }
          : undefined
    });
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch job status"
        }
      },
      { status: 500 }
    );
  }
}
