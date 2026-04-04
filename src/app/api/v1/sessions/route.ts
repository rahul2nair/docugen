import { NextResponse } from "next/server";
import { config } from "@/server/config";
import { rateLimitExceededResponse, enforceRateLimits } from "@/server/rate-limit";
import { readRequestIp } from "@/server/request-context";
import { createWorkspaceSession } from "@/server/session-store";
import { createSessionSchema } from "@/server/validation";
import { applyWorkspaceSessionCookie } from "@/server/workspace-session-cookie";

export async function POST(request: Request) {
  const clientIp = readRequestIp(request) || "unknown";
  const rateLimitViolation = await enforceRateLimits([
    {
      bucket: "session-create:ip",
      identifiers: [clientIp],
      limit: config.rateLimit.sessionCreateLimit,
      windowSeconds: config.rateLimit.sessionCreateWindowSeconds
    }
  ]);

  if (rateLimitViolation) {
    return rateLimitExceededResponse(
      rateLimitViolation,
      "Too many workspace sessions were created from this network. Try again shortly."
    );
  }

  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = createSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid session creation request",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const created = await createWorkspaceSession(parsed.data.initialState);

  const response = NextResponse.json(
    {
      token: created.token,
      shareUrl: created.shareUrl,
      session: created.session
    },
    { status: 201 }
  );

  applyWorkspaceSessionCookie(response, created.token);
  return response;
}
