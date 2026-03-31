ALTER TABLE public.user_api_keys
  ADD COLUMN label text,
  ADD COLUMN created_by text,
  ADD COLUMN scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN ownership_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN last_used_at timestamptz(6),
  ADD COLUMN revoked_at timestamptz(6);

UPDATE public.user_api_keys
SET scopes = ARRAY[
  'generations:create',
  'generations:create:inline',
  'generations:create:batch',
  'generations:read'
]
WHERE coalesce(array_length(scopes, 1), 0) = 0;
