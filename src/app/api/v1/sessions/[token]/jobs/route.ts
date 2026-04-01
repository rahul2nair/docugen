import { NextResponse } from "next/server";
import { logError, logWarn } from "@/server/logger";
import { generationQueue } from "@/server/queue";
import { listSessionJobs } from "@/server/session-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit") || "20");
    const limit = Number.isNaN(limitRaw) ? 20 : Math.max(1, Math.min(limitRaw, 100));

    const found = await listSessionJobs(token, limit);

    if (!found) {
      logWarn("session_jobs_not_found", {
        token,
        limit
      });
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
        { status: 404 }
      );
    }

    const jobs = await Promise.all(
      found.jobs.map(async (item) => {
        try {
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
        } catch (error) {
          logError("session_job_lookup_failed", error, {
            token,
            jobId: item.id
          });
          return {
            id: item.id,
            createdAt: item.createdAt,
            status: "not_found"
          };
        }
      })
    );

    return NextResponse.json({
      revision: found.session.revision,
      jobs
    });
  } catch (error) {
    logError("session_jobs_unhandled_error", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unable to load session jobs" } },
      { status: 500 }
    );
  }
}
