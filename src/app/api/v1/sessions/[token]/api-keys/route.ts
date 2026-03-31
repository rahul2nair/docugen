import { NextResponse } from "next/server";
import { requirePaidPlanForOwnerKey } from "@/server/api-auth";
import { resolvePersistenceContext } from "@/server/persistence-context";
import {
  createManagedApiKeyByOwnerKey,
  deleteApiKeyByOwnerKey,
  listApiKeysByOwnerKeys,
  listRevokedApiKeysByOwnerKeys
} from "@/server/user-data-store";
import { apiKeyCreateSchema, apiKeyDeleteSchema } from "@/server/validation";

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

  if (!found.authenticatedUserId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "API keys are only available to signed-in accounts" } },
      { status: 403 }
    );
  }

  const paidResponse = await requirePaidPlanForOwnerKey(found.ownerKey, "account API keys");
  if (paidResponse) {
    return paidResponse;
  }

  try {
    const apiKeys = await listApiKeysByOwnerKeys([found.ownerKey]);
    const revokedApiKeys = await listRevokedApiKeysByOwnerKeys([found.ownerKey]);
    return NextResponse.json({ apiKeys, revokedApiKeys });
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

  if (!found.authenticatedUserId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "API keys are only available to signed-in accounts" } },
      { status: 403 }
    );
  }

  const paidResponse = await requirePaidPlanForOwnerKey(found.ownerKey, "account API keys");
  if (paidResponse) {
    return paidResponse;
  }

  try {
    let body: unknown = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = apiKeyCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid API key scope payload",
            details: parsed.error.flatten()
          }
        },
        { status: 400 }
      );
    }

    const generated = await createManagedApiKeyByOwnerKey(found.ownerKey, parsed.data.scopes, {
      label: parsed.data.label,
      createdBy: found.authenticatedUserId || found.ownerKey
    });
    return NextResponse.json({ apiKey: generated });
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

  if (!found.authenticatedUserId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "API keys are only available to signed-in accounts" } },
      { status: 403 }
    );
  }

  const paidResponse = await requirePaidPlanForOwnerKey(found.ownerKey, "account API keys");
  if (paidResponse) {
    return paidResponse;
  }

  const searchParams = new URL(request.url).searchParams;
  const parsed = apiKeyDeleteSchema.safeParse({ id: searchParams.get("id") || "" });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "id is required",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  try {
    await deleteApiKeyByOwnerKey(found.ownerKey, parsed.data.id);
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
