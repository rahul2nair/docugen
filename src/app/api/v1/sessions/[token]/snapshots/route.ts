import { NextResponse } from "next/server";
import { listSnapshots, saveSessionState } from "@/server/session-store";
import { listSnapshotsSchema, saveSessionStateSchema } from "@/server/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const url = new URL(request.url);

  const parsedQuery = listSnapshotsSchema.safeParse({
    limit: url.searchParams.get("limit") || undefined
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid snapshots query",
          details: parsedQuery.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const found = await listSnapshots(token, parsedQuery.data.limit);

  if (!found) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    revision: found.session.revision,
    snapshots: found.snapshots
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

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
          message: "Invalid snapshot creation request",
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
    kind: parsed.data.kind || "manual",
    createSnapshot: true,
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

  return NextResponse.json(
    {
      session: result.session,
      snapshot: result.snapshot
    },
    { status: 201 }
  );
}
