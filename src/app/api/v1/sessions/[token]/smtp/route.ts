import { NextResponse } from "next/server";
import { resolvePersistenceContext } from "@/server/persistence-context";
import {
  deleteSmtpSettingsByOwnerKey,
  getSmtpSettingsByOwnerKey,
  upsertSmtpSettingsByOwnerKey
} from "@/server/user-data-store";
import { smtpSettingsSchema } from "@/server/validation";

function paidPersistenceRequiredResponse() {
  return NextResponse.json(
    {
      error: {
        code: "STORAGE_UNAVAILABLE",
        message: "Saved SMTP settings are part of Pro or trial. Free usage stays local to this browser."
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
    const smtp = await getSmtpSettingsByOwnerKey(found.ownerKey);
    return NextResponse.json({ smtp });
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

export async function PUT(
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

  const parsed = smtpSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid SMTP settings payload",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  try {
    await upsertSmtpSettingsByOwnerKey(found.ownerKey, parsed.data);
    const smtp = await getSmtpSettingsByOwnerKey(found.ownerKey);
    return NextResponse.json({ smtp });
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
    await deleteSmtpSettingsByOwnerKey(found.ownerKey);
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