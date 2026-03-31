import { NextResponse } from "next/server";
import { generationQueue } from "@/server/queue";
import { listSessionJobs } from "@/server/session-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") || "20");
  const limit = Number.isNaN(limitRaw) ? 20 : Math.max(1, Math.min(limitRaw, 100));

  const found = await listSessionJobs(token, limit);

  if (!found) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  const jobs = await Promise.all(
    found.jobs.map(async (item) => {
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

  return NextResponse.json({
    revision: found.session.revision,
    jobs
  });
}
