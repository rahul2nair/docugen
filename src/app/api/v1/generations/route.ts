import { NextResponse } from "next/server";
import { trackGenerationJobForOwnerKey } from "@/server/api-job-store";
import { hasAccountApiKeyScope, requirePaidPlanForOwnerKey, resolveAccountApiKeyAuth } from "@/server/api-auth";
import { config } from "@/server/config";
import { generationQueue } from "@/server/queue";
import { resolvePersistenceContext } from "@/server/persistence-context";
import { rateLimitExceededResponse, enforceRateLimits } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";
import { getSessionByToken, trackGenerationJobForSession } from "@/server/session-store";
import { generationRequestSchema } from "@/server/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = generationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid generation request",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const accountApiAuth = await resolveAccountApiKeyAuth(request);
  const sessionToken = parsed.data.session?.token?.trim();
  const clientIp = readRequestIp(request) || "unknown";
  let persistenceContext: Awaited<ReturnType<typeof resolvePersistenceContext>> | null = null;

  if (!sessionToken && !accountApiAuth) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Provide a workspace session token or an account API key to create generation jobs"
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
          message: "This API key cannot create standard generation jobs"
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
        ]
      : [
          {
            bucket: "generation-write:session",
            identifiers: [sessionToken, clientIp],
            limit: config.rateLimit.anonymousWriteLimit,
            windowSeconds: config.rateLimit.anonymousWriteWindowSeconds
          }
        ]
  );

  if (rateLimitViolation) {
    return rateLimitExceededResponse(
      rateLimitViolation,
      "Generation rate limit exceeded. Wait briefly before queueing more jobs."
    );
  }

  const ownerKeyForJob = accountApiAuth?.ownerKey || (persistenceContext?.authenticatedUserId ? persistenceContext.ownerKey : null);
  const queuePayload = ownerKeyForJob
    ? {
        ...parsed.data,
        persistence: {
          ownerKey: ownerKeyForJob
        }
      }
    : parsed.data;

  const job = await generationQueue.add("generate", queuePayload);

  if (sessionToken && job.id) {
    try {
      await trackGenerationJobForSession(sessionToken, String(job.id));
    } catch (error) {
      console.error("Failed to track generation job by session:", error);
    }
  }

  if (ownerKeyForJob && job.id) {
    await trackGenerationJobForOwnerKey(ownerKeyForJob, String(job.id));
  }

  return NextResponse.json({
    jobId: job.id,
    status: "queued"
  });
}
