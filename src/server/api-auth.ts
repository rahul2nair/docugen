import { NextResponse } from "next/server";
import { hasActivePaidAccessForOwnerKey } from "@/server/billing-store";
import { markManagedApiKeyUsed, resolveOwnerKeyForManagedApiKey } from "@/server/user-data-store";
import { readRequestIp, readRequestUserAgent } from "@/server/request-context";
import type { ApiKeyScope } from "@/lib/api-key-scopes";

function readApiKeyFromRequest(request: Request) {
  const bearer = request.headers.get("authorization")?.trim();
  if (bearer?.toLowerCase().startsWith("bearer ")) {
    return bearer.slice(7).trim();
  }

  return request.headers.get("x-api-key")?.trim() || "";
}

export async function resolveAccountApiKeyAuth(request: Request) {
  const apiKey = readApiKeyFromRequest(request);
  if (!apiKey) {
    return null;
  }

  const resolved = await resolveOwnerKeyForManagedApiKey(apiKey);
  if (!resolved) {
    return null;
  }

  await markManagedApiKeyUsed(resolved.id, {
    lastUsedIp: readRequestIp(request),
    lastUsedUserAgent: readRequestUserAgent(request)
  });
  return resolved;
}

export function hasAccountApiKeyScope(auth: { scopes: ApiKeyScope[] } | null, scope: ApiKeyScope) {
  return Boolean(auth?.scopes.includes(scope));
}

export function paymentRequiredApiResponse(feature: string) {
  return NextResponse.json(
    {
      error: {
        code: "PAYMENT_REQUIRED",
        message: `An active Pro plan is required for ${feature}`
      }
    },
    { status: 402 }
  );
}

export async function requirePaidPlanForOwnerKey(ownerKey: string, feature: string) {
  const hasPaidAccess = await hasActivePaidAccessForOwnerKey(ownerKey);
  return hasPaidAccess ? null : paymentRequiredApiResponse(feature);
}