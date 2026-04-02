import { NextResponse } from "next/server";
import { trackGenerationJobForOwnerKey } from "@/server/api-job-store";
import { hasAccountApiKeyScope, requirePaidPlanForOwnerKey, resolveAccountApiKeyAuth } from "@/server/api-auth";
import { hasActivePaidAccessForOwnerKey } from "@/server/billing-store";
import { config } from "@/server/config";
import { logError, logInfo, logWarn } from "@/server/logger";
import { resolvePersistenceContext } from "@/server/persistence-context";
import { generationQueue } from "@/server/queue";
import { rateLimitExceededResponse, enforceRateLimits } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";
import { getSessionByToken, trackGenerationJobForSession } from "@/server/session-store";
import { batchGenerationRequestSchema } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = batchGenerationRequestSchema.safeParse(body);

    if (!parsed.success) {
      logWarn("batch_request_validation_failed", {
        details: parsed.error.flatten()
      });
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
      logWarn("batch_request_unauthorized", {
        reason: "missing_session_and_api_key",
        clientIp
      });
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
      logWarn("batch_request_forbidden_scope", {
        ownerKey: accountApiAuth.ownerKey,
        apiKeyId: accountApiAuth.id
      });
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
        logWarn("batch_request_paid_plan_required", {
          ownerKey: accountApiAuth.ownerKey,
          apiKeyId: accountApiAuth.id
        });
        return paidResponse;
      }
    }

    if (sessionToken && !accountApiAuth) {
      const existingSession = await getSessionByToken(sessionToken);
      if (!existingSession) {
        logWarn("batch_request_invalid_session", {
          sessionToken
        });
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

      if (!persistenceContext?.hasPaidAccess) {
        logWarn("batch_request_paid_plan_required", {
          reason: "session_without_paid_access",
          sessionToken,
          authenticatedUserId: persistenceContext?.authenticatedUserId || null
        });
        return NextResponse.json(
          {
            error: {
              code: "PAYMENT_REQUIRED",
              message: "Batch generation is available on paid plans only"
            }
          },
          { status: 402 }
        );
      }
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
      logWarn("batch_request_rate_limited", {
        bucket: rateLimitViolation.bucket,
        retryAfterSeconds: rateLimitViolation.retryAfterSeconds,
        remaining: rateLimitViolation.remaining,
        limit: rateLimitViolation.limit
      });
      return rateLimitExceededResponse(
        rateLimitViolation,
        "Batch generation rate limit exceeded. Reduce the batch size or retry later."
      );
    }

    const sessionOwnerHasPaidAccess = persistenceContext?.authenticatedUserId
      ? await hasActivePaidAccessForOwnerKey(persistenceContext.ownerKey)
      : false;

    const ownerKeyForJobs = accountApiAuth?.ownerKey || (sessionOwnerHasPaidAccess ? persistenceContext?.ownerKey || null : null);
    const shouldSaveToMyFiles = parsed.data.saveToMyFiles === true;

    const jobs = await Promise.all(
      parsed.data.requests.map((payload) =>
        generationQueue.add(
          "generate",
          ownerKeyForJobs && shouldSaveToMyFiles
            ? {
                ...payload,
                persistence: {
                  ownerKey: ownerKeyForJobs
                }
              }
            : payload
        )
      )
    );

    if (sessionToken) {
      await Promise.all(
        jobs.map(async (job) => {
          if (!job.id) return;
          try {
            await trackGenerationJobForSession(sessionToken, String(job.id));
          } catch (error) {
            logError("batch_track_session_job_failed", error, {
              sessionToken,
              jobId: String(job.id)
            });
          }
        })
      );
    }

    if (ownerKeyForJobs) {
      await Promise.all(
        jobs.map(async (job) => {
          if (!job.id) return;
          try {
            await trackGenerationJobForOwnerKey(ownerKeyForJobs, String(job.id));
          } catch (error) {
            logError("batch_track_owner_job_failed", error, {
              ownerKey: ownerKeyForJobs,
              jobId: String(job.id)
            });
          }
        })
      );
    }

    logInfo("batch_jobs_queued", {
      queued: jobs.length,
      sessionToken,
      ownerKey: ownerKeyForJobs,
      clientIp
    });

    return NextResponse.json({
      queued: jobs.length,
      jobIds: jobs.map((job) => String(job.id))
    });
  } catch (error) {
    logError("batch_queue_unhandled_error", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to queue batch right now"
        }
      },
      { status: 500 }
    );
  }
}
