create table if not exists user_profiles (
  owner_session_id text primary key,
  company_name text,
  logo_url text,
  primary_color text,
  accent_color text,
  footer_text text,
  signer_name text,
  signer_title text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_templates (
  id text primary key,
  owner_session_id text not null,
  name text not null,
  description text,
  category text,
  supported_outputs text[] not null default '{html,pdf}',
  fields jsonb not null default '[]'::jsonb,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_templates_owner_session_id
  on user_templates (owner_session_id);

create table if not exists user_api_keys (
  owner_session_id text not null,
  provider text not null,
  encrypted_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_session_id, provider)
);

create table if not exists user_smtp_settings (
  owner_session_id text primary key,
  host text not null,
  port text not null,
  secure boolean not null default false,
  username text not null,
  password_encrypted text not null,
  from_name text,
  from_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger user_profiles_set_updated_at
before update on user_profiles
for each row execute function set_updated_at();

create or replace trigger user_templates_set_updated_at
before update on user_templates
for each row execute function set_updated_at();

create or replace trigger user_api_keys_set_updated_at
before update on user_api_keys
for each row execute function set_updated_at();

create or replace trigger user_smtp_settings_set_updated_at
before update on user_smtp_settings
for each row execute function set_updated_at();
