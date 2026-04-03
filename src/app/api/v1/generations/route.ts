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

  const hasPaidAccess = accountApiAuth
    ? true
    : Boolean(persistenceContext?.hasPaidAccess);
  const dailyLimit = hasPaidAccess
    ? config.rateLimit.paidDailyGenerationLimit
    : config.rateLimit.freeDailyGenerationLimit;
  const dailyIdentifiers = accountApiAuth
    ? [accountApiAuth.ownerKey]
    : persistenceContext?.accountOwnerKey
      ? [persistenceContext.accountOwnerKey]
      : [sessionToken, clientIp];

  const rateLimitViolation = await enforceRateLimits(
    [
      {
        bucket: hasPaidAccess ? "generation-write:daily:paid" : "generation-write:daily:free",
        identifiers: dailyIdentifiers,
        limit: dailyLimit,
        windowSeconds: config.rateLimit.dailyGenerationWindowSeconds
      },
      ...(accountApiAuth
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
        ])
    ]
  );

  if (rateLimitViolation) {
    const limitMessage = rateLimitViolation.bucket.startsWith("generation-write:daily")
      ? `Daily generation limit reached. ${hasPaidAccess ? "Paid accounts can create up to 20 standard documents per day." : "Free accounts can create up to 10 standard documents per day."} Use bulk generation for larger runs.`
      : "Generation rate limit exceeded. Wait briefly before queueing more jobs.";

    return rateLimitExceededResponse(
      rateLimitViolation,
      limitMessage
    );
  }

  const sessionOwnerHasPaidAccess = persistenceContext?.authenticatedUserId
    ? await hasActivePaidAccessForOwnerKey(persistenceContext.ownerKey)
    : false;
  const ownerKeyForAccess = accountApiAuth?.ownerKey || persistenceContext?.ownerKey || null;
  const ownerKeyForJob = accountApiAuth?.ownerKey || (sessionOwnerHasPaidAccess ? persistenceContext?.ownerKey || null : null);
  const shouldSaveToMyFiles = ownerKeyForJob ? parsed.data.saveToMyFiles !== false : false;
  const queuePayload = ownerKeyForJob
    && shouldSaveToMyFiles
    ? {
        ...parsed.data,
        saveToMyFiles: true,
        persistence: {
          ownerKey: ownerKeyForJob
        }
      }
    : {
        ...parsed.data,
        saveToMyFiles: false
      };

  const job = await generationQueue.add("generate", queuePayload);

  if (sessionToken && job.id) {
    try {
      await trackGenerationJobForSession(sessionToken, String(job.id));
    } catch (error) {
      console.error("Failed to track generation job by session:", error);
    }
  }

  if (ownerKeyForAccess && job.id) {
    await trackGenerationJobForOwnerKey(ownerKeyForAccess, String(job.id));
  }

  return NextResponse.json({
    jobId: job.id,
    status: "queued"
  });
}
