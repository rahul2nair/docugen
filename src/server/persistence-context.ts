import { createClient as createAuthClient } from "@/lib/supabase/server";
import { getSessionByToken } from "@/server/session-store";
import { claimPersistedData, sessionOwnerKey, userOwnerKey } from "@/server/user-data-store";

export async function getAuthenticatedUserId() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return data.user?.id || null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedOwnerKey() {
  const authenticatedUserId = await getAuthenticatedUserId();

  if (!authenticatedUserId) {
    return null;
  }

  return userOwnerKey(authenticatedUserId);
}

export async function resolvePersistenceContext(token: string) {
  const found = await getSessionByToken(token);

  if (!found) {
    return null;
  }

  const normalizedSessionOwnerKey = sessionOwnerKey(found.session.id);

  await claimPersistedData(normalizedSessionOwnerKey, [found.session.id]);

  const authenticatedUserId = await getAuthenticatedUserId();

  if (!authenticatedUserId) {
    return {
      ...found,
      ownerKey: normalizedSessionOwnerKey,
      authenticatedUserId: null
    };
  }

  const authenticatedOwnerKey = userOwnerKey(authenticatedUserId);
  await claimPersistedData(authenticatedOwnerKey, [normalizedSessionOwnerKey, found.session.id]);

  return {
    ...found,
    ownerKey: authenticatedOwnerKey,
    authenticatedUserId
  };
}