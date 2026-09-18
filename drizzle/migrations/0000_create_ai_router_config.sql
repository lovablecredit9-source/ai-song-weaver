CREATE TABLE public.ai_router_config (
  id text PRIMARY KEY DEFAULT 'default',
  base_url text NOT NULL DEFAULT '',
  api_key text,
  model text NOT NULL DEFAULT '',
  models jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ai_router_config TO service_role;

ALTER TABLE public.ai_router_config ENABLE ROW LEVEL SECURITY;
