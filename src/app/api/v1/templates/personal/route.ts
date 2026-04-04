import { NextResponse } from "next/server";
import { hasAccountApiKeyScope, requirePaidPlanForOwnerKey, resolveAccountApiKeyAuth, apiKeyExpiredResponse } from "@/server/api-auth";
import {
  deleteTemplateByOwnerKey,
  listTemplatesByOwnerKeys,
  saveTemplateByOwnerKey
} from "@/server/user-data-store";
import { templateDeleteSchema, templateUpsertSchema } from "@/server/validation";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: {
        code: "UNAUTHORIZED",
        message: "Provide an account API key to access saved template APIs"
      }
    },
    { status: 401 }
  );
}

function forbiddenResponse(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "FORBIDDEN",
        message
      }
    },
    { status: 403 }
  );
}

function storageUnavailableResponse(error: unknown) {
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

export async function GET(request: Request) {
  const accountApiAuth = await resolveAccountApiKeyAuth(request);

  if (accountApiAuth && "error" in accountApiAuth) {
    if (accountApiAuth.error === "expired") {
      return apiKeyExpiredResponse();
    }
    return unauthorizedResponse();
  }

  if (!accountApiAuth) {
    return unauthorizedResponse();
  }

  if (!hasAccountApiKeyScope(accountApiAuth, "templates:read")) {
    return forbiddenResponse("This API key cannot list saved templates");
  }

  const paidResponse = await requirePaidPlanForOwnerKey(accountApiAuth.ownerKey, "saved templates API access");
  if (paidResponse) {
    return paidResponse;
  }

  try {
    const templates = await listTemplatesByOwnerKeys([accountApiAuth.ownerKey]);
    return NextResponse.json({ templates });
  } catch (error) {
    return storageUnavailableResponse(error);
  }
}

export async function POST(request: Request) {
  const accountApiAuth = await resolveAccountApiKeyAuth(request);

  if (accountApiAuth && "error" in accountApiAuth) {
    if (accountApiAuth.error === "expired") {
      return apiKeyExpiredResponse();
    }
    return unauthorizedResponse();
  }

  if (!accountApiAuth) {
    return unauthorizedResponse();
  }

  if (!hasAccountApiKeyScope(accountApiAuth, "templates:write")) {
    return forbiddenResponse("This API key cannot create or update saved templates");
  }

  const paidResponse = await requirePaidPlanForOwnerKey(accountApiAuth.ownerKey, "saved templates API access");
  if (paidResponse) {
    return paidResponse;
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
    const id = await saveTemplateByOwnerKey(accountApiAuth.ownerKey, parsed.data);
    return NextResponse.json({ id });
  } catch (error) {
    return storageUnavailableResponse(error);
  }
}

export async function DELETE(request: Request) {
  const accountApiAuth = await resolveAccountApiKeyAuth(request);

  if (accountApiAuth && "error" in accountApiAuth) {
    if (accountApiAuth.error === "expired") {
      return apiKeyExpiredResponse();
    }
    return unauthorizedResponse();
  }

  if (!accountApiAuth) {
    return unauthorizedResponse();
  }

  if (!hasAccountApiKeyScope(accountApiAuth, "templates:delete")) {
    return forbiddenResponse("This API key cannot delete saved templates");
  }

  const paidResponse = await requirePaidPlanForOwnerKey(accountApiAuth.ownerKey, "saved templates API access");
  if (paidResponse) {
    return paidResponse;
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
    await deleteTemplateByOwnerKey(accountApiAuth.ownerKey, parsed.data.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return storageUnavailableResponse(error);
  }
}
