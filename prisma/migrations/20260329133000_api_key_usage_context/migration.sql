ALTER TABLE public.user_api_keys
  ADD COLUMN last_used_ip text,
  ADD COLUMN last_used_user_agent text;
