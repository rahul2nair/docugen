-- Harden app-owned public tables for Supabase security checks.
-- The app uses server-side credentials for access, so public client roles should not have table access.

ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_smtp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_generated_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_billing_accounts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_templates FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_api_keys FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_smtp_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_generated_files FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_billing_accounts FROM anon, authenticated;
