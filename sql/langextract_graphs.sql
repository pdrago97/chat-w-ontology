-- Minimal table to store whole LangExtract-curated graphs as JSONB
-- Safe to run with PostgREST; supports REST read/write via Supabase

create table if not exists public.langextract_graphs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  source text,               -- optional, e.g. 'resume-poc' or 'curator-worker'
  meta jsonb,                -- optional metadata (model, passes, etc.)
  graph jsonb not null       -- { nodes: [...], edges: [...] }
);

-- Helpful index for recency queries
create index if not exists idx_langextract_graphs_created_at on public.langextract_graphs(created_at desc);

-- Row Level Security: allow anonymous read if you use anon key on server only; keep writes service-key only
alter table public.langextract_graphs enable row level security;

-- Read policy for service role or server-side usage; adjust as needed
-- For quick start, allow all read (server-side only). Remove in production client apps.
create policy if not exists "allow read for all" on public.langextract_graphs
  for select using (true);

-- No default insert policy; use service key from server to write

