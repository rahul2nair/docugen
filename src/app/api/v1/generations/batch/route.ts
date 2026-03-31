import { NextResponse } from "next/server";
import { trackGenerationJobForOwnerKey } from "@/server/api-job-store";
import { hasAccountApiKeyScope, requirePaidPlanForOwnerKey, resolveAccountApiKeyAuth } from "@/server/api-auth";
import { hasActivePaidAccessForOwnerKey } from "@/server/billing-store";
import { config } from "@/server/config";
import { generationQueue } from "@/server/queue";
import { resolvePersistenceContext } from "@/server/persistence-context";
import { rateLimitExceededResponse, enforceRateLimits } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";
import { getSessionByToken, trackGenerationJobForSession } from "@/server/session-store";
import { batchGenerationRequestSchema } from "@/server/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = batchGenerationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid batch generation request",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const accountApiAuth = await resolveAccountApiKeyAuth(request);
  const sessionToken = parsed.data.sessionToken?.trim();
  const clientIp = readRequestIp(request) || "unknown";
  const batchCost = Math.max(parsed.data.requests.length, 1);
  let persistenceContext: Awaited<ReturnType<typeof resolvePersistenceContext>> | null = null;

  if (!sessionToken && !accountApiAuth) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Provide a workspace session token or an account API key to queue batch jobs"
        }
      },
      { status: 401 }
    );
  }

  if (!sessionToken && accountApiAuth && !hasAccountApiKeyScope(accountApiAuth, "generations:create:batch")) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "This API key cannot create batch jobs"
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

    persistenceContext = await resolvePersistenceContext(sessionToken);
  }

  const rateLimitViolation = await enforceRateLimits(
    accountApiAuth
      ? [
          {
            bucket: "generation-batch:api-key",
            identifiers: [accountApiAuth.id, accountApiAuth.ownerKey],
            limit: config.rateLimit.apiWriteLimit,
            windowSeconds: config.rateLimit.apiWriteWindowSeconds,
            cost: batchCost
          },
          {
            bucket: "generation-batch:ip-safety",
            identifiers: [clientIp],
            limit: config.rateLimit.ipSafetyLimit,
            windowSeconds: config.rateLimit.ipSafetyWindowSeconds,
            cost: batchCost
          }
        ]
      : [
          {
            bucket: "generation-batch:session",
            identifiers: [sessionToken, clientIp],
            limit: config.rateLimit.anonymousWriteLimit,
            windowSeconds: config.rateLimit.anonymousWriteWindowSeconds,
            cost: batchCost
          }
        ]
  );

  if (rateLimitViolation) {
    return rateLimitExceededResponse(
      rateLimitViolation,
      "Batch generation rate limit exceeded. Reduce the batch size or retry later."
    );
  }

  const sessionOwnerHasPaidAccess = persistenceContext?.authenticatedUserId
    ? await hasActivePaidAccessForOwnerKey(persistenceContext.ownerKey)
    : false;
  const ownerKeyForJobs = accountApiAuth?.ownerKey || (sessionOwnerHasPaidAccess ? persistenceContext?.ownerKey || null : null);
  const jobs = await Promise.all(
    parsed.data.requests.map((payload) => generationQueue.add("generate", ownerKeyForJobs
      ? {
          ...payload,
          persistence: {
            ownerKey: ownerKeyForJobs
          }
        }
      : payload))
  );

  if (sessionToken) {
    await Promise.all(
      jobs.map(async (job) => {
        if (!job.id) return;
        try {
          await trackGenerationJobForSession(sessionToken, String(job.id));
        } catch (error) {
          console.error("Failed to track batch generation job by session:", error);
        }
      })
    );
  }

  if (ownerKeyForJobs) {
    await Promise.all(
      jobs.map(async (job) => {
        if (!job.id) return;
        await trackGenerationJobForOwnerKey(ownerKeyForJobs, String(job.id));
      })
    );
  }

  return NextResponse.json({
    queued: jobs.length,
    jobIds: jobs.map((job) => String(job.id))
  });
}
