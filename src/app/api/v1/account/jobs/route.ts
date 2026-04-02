import { NextResponse } from "next/server";
import { listGenerationJobsForOwnerKey } from "@/server/api-job-store";
import { config } from "@/server/config";
import { getAuthenticatedOwnerKey } from "@/server/persistence-context";
import { generationQueue } from "@/server/queue";
import { rateLimitExceededResponse, enforceRateLimits } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";

export async function GET(request: Request) {
  const ownerKey = await getAuthenticatedOwnerKey();
  if (!ownerKey) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in to view account activity" } },
      { status: 401 }
    );
  }

  const clientIp = readRequestIp(request) || "unknown";
  const rateLimitViolation = await enforceRateLimits([
    {
      bucket: "generation-read:signed-in-user",
      identifiers: [ownerKey, clientIp],
      limit: config.rateLimit.apiReadLimit,
      windowSeconds: config.rateLimit.apiReadWindowSeconds
    }
  ]);

  if (rateLimitViolation) {
    return rateLimitExceededResponse(
      rateLimitViolation,
      "Activity polling is temporarily rate limited. Try again shortly."
    );
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") || "50");
  const limit = Number.isNaN(limitRaw) ? 50 : Math.max(1, Math.min(limitRaw, 200));
  const trackedJobs = await listGenerationJobsForOwnerKey(ownerKey, limit);

  const jobs = await Promise.all(
    trackedJobs.map(async (item) => {
      const job = await generationQueue.getJob(item.id);

      if (!job) {
        return {
          id: item.id,
          createdAt: item.createdAt,
          status: "not_found"
        };
      }

      const state = await job.getState();

      return {
        id: item.id,
        createdAt: item.createdAt,
        status: state,
        result: state === "completed" ? job.returnvalue : undefined,
        error: state === "failed" ? job.failedReason || "Generation failed" : undefined
      };
    })
  );

  return NextResponse.json({ jobs });
}
