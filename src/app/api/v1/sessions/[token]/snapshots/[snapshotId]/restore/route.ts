import { NextResponse } from "next/server";
import { getSnapshotById, saveSessionState } from "@/server/session-store";
import { restoreSnapshotSchema } from "@/server/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string; snapshotId: string }> }
) {
  const { token, snapshotId } = await params;

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

  const parsed = restoreSnapshotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid snapshot restore request",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const found = await getSnapshotById(token, snapshotId);

  if (!found?.session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  if (!found.snapshot) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Snapshot not found" } },
      { status: 404 }
    );
  }

  const result = await saveSessionState(token, {
    editorId: parsed.data.editorId,
    baseRevision: parsed.data.baseRevision,
    note: parsed.data.note || `Restored snapshot ${snapshotId}`,
    kind: "restore",
    createSnapshot: true,
    state: found.snapshot.state
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
          message: "Session has changed. Refresh and retry restore.",
          currentRevision: result.conflict?.currentRevision
        },
        session: result.conflict?.session
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    restoredFrom: found.snapshot.id,
    session: result.session,
    snapshot: result.snapshot
  });
}
