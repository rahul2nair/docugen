import { NextResponse } from "next/server";
import { resolvePersistenceContext } from "@/server/persistence-context";
import { getProfileByOwnerKey, upsertProfileByOwnerKey } from "@/server/user-data-store";
import { profileUpsertSchema } from "@/server/validation";

function paidPersistenceRequiredResponse() {
  return NextResponse.json(
    {
      error: {
        code: "STORAGE_UNAVAILABLE",
        message: "Saved profile data is part of Pro or trial. Free usage stays local to this browser."
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
    const profile = await getProfileByOwnerKey(found.ownerKey);
    return NextResponse.json({ profile });
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

  const parsed = profileUpsertSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid profile payload",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  try {
    await upsertProfileByOwnerKey(found.ownerKey, parsed.data);
    const profile = await getProfileByOwnerKey(found.ownerKey);
    return NextResponse.json({ profile });
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
