import { createClient } from "@supabase/supabase-js";

type SupabaseAdminClient = ReturnType<typeof createClient<any>>;

let cachedClient: SupabaseAdminClient | null | undefined;

export function getSupabaseAdminClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient<any>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return cachedClient;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseAdminClient());
}
