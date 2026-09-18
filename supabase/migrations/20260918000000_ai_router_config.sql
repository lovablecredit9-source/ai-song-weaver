create table if not exists public.ai_router_config (
  id integer primary key default 1 check (id = 1),
  base_url text not null,
  api_key text not null,
  model text not null,
  models jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ai_router_config enable row level security;

revoke all on table public.ai_router_config from anon, authenticated;

-- The application server uses the Supabase service-role key, so browser
-- clients never need direct database access or Supabase project credentials.
