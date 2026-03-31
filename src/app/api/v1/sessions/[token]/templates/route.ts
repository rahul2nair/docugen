import { NextResponse } from "next/server";
import { resolvePersistenceContext } from "@/server/persistence-context";
import {
  deleteTemplateByOwnerKey,
  listTemplatesByOwnerKeys,
  saveTemplateByOwnerKey
} from "@/server/user-data-store";
import { templateDeleteSchema, templateUpsertSchema } from "@/server/validation";

function paidPersistenceRequiredResponse() {
  return NextResponse.json(
    {
      error: {
        code: "STORAGE_UNAVAILABLE",
        message: "Saved personal templates are part of Pro or trial. Free usage stays local to this browser."
      }
    },
    { status: 503 }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const found = await resolvePersistenceContext(token);

  if (!found) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  if (!found.hasPaidAccess) {
    return paidPersistenceRequiredResponse();
  }

  try {
    const templates = await listTemplatesByOwnerKeys([found.ownerKey]);
    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: error instanceof Error ? error.message : "Persistent storage is not configured"
        }
      },
      { status: 503 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const found = await resolvePersistenceContext(token);

  if (!found) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  if (!found.hasPaidAccess) {
    return paidPersistenceRequiredResponse();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }

  const parsed = templateUpsertSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid template payload",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  try {
    const id = await saveTemplateByOwnerKey(found.ownerKey, parsed.data);
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: error instanceof Error ? error.message : "Persistent storage is not configured"
        }
      },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const found = await resolvePersistenceContext(token);

  if (!found) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  if (!found.hasPaidAccess) {
    return paidPersistenceRequiredResponse();
  }

  const searchParams = new URL(request.url).searchParams;
  const parsed = templateDeleteSchema.safeParse({ id: searchParams.get("id") || "" });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Template id is required",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  try {
    await deleteTemplateByOwnerKey(found.ownerKey, parsed.data.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: error instanceof Error ? error.message : "Persistent storage is not configured"
        }
      },
      { status: 503 }
    );
  }
}
