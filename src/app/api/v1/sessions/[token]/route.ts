import { NextResponse } from "next/server";
import { getSessionByToken, saveSessionState, touchSession } from "@/server/session-store";
import { saveSessionStateSchema } from "@/server/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await touchSession(token);

  if (!session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ session });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const found = await getSessionByToken(token);

  if (!found) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON"
        }
      },
      { status: 400 }
    );
  }

  const parsed = saveSessionStateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid session update request",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const result = await saveSessionState(token, {
    editorId: parsed.data.editorId,
    baseRevision: parsed.data.baseRevision,
    note: parsed.data.note,
    kind: parsed.data.kind,
    createSnapshot: parsed.data.createSnapshot,
    state: parsed.data.state
  });

  if (!result) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          code: "REVISION_CONFLICT",
          message: "Session has changed. Refresh and re-apply edits.",
          currentRevision: result.conflict?.currentRevision
        },
        session: result.conflict?.session
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    session: result.session,
    snapshot: result.snapshot
  });
}
