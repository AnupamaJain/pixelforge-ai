-- Product Studio, brand kits, batch runs, client workspaces and creative
-- performance tracking.
--
-- Same security posture as 0001: every table is RLS-scoped to auth.uid(), and
-- anything that costs money or grants capability is server-written only.

-- ---------------------------------------------------------------------------
-- Client workspaces (Agency tier)
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index clients_user_idx on public.clients (user_id, archived);
alter table public.clients enable row level security;

create policy "clients_select_own" on public.clients
  for select using (auth.uid() = user_id);
create policy "clients_insert_own" on public.clients
  for insert with check (auth.uid() = user_id);
create policy "clients_update_own" on public.clients
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clients_delete_own" on public.clients
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Brand kits
-- ---------------------------------------------------------------------------
create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  name text not null,
  description text,
  -- Hex colours enforced at generation time via prompt conditioning.
  palette jsonb not null default '[]'::jsonb,
  prompt_modifier text,
  negative_modifier text,
  -- Styles this kit permits. Empty = all styles allowed.
  allowed_styles jsonb not null default '[]'::jsonb,
  default_style_id text,
  -- Reference imagery used for visual conditioning.
  reference_paths jsonb not null default '[]'::jsonb,
  logo_path text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index brand_kits_user_idx on public.brand_kits (user_id, created_at desc);
create index brand_kits_client_idx on public.brand_kits (client_id);
alter table public.brand_kits enable row level security;

create policy "brand_kits_select_own" on public.brand_kits
  for select using (auth.uid() = user_id);
create policy "brand_kits_insert_own" on public.brand_kits
  for insert with check (auth.uid() = user_id);
create policy "brand_kits_update_own" on public.brand_kits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "brand_kits_delete_own" on public.brand_kits
  for delete using (auth.uid() = user_id);

-- Only one default kit per user.
create unique index brand_kits_one_default
  on public.brand_kits (user_id) where is_default;

-- ---------------------------------------------------------------------------
-- Batch runs
-- ---------------------------------------------------------------------------
create type batch_status as enum ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

create table public.batch_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  brand_kit_id uuid references public.brand_kits(id) on delete set null,
  name text not null,
  type generation_type not null,
  status batch_status not null default 'QUEUED',
  total_rows integer not null default 0,
  completed_rows integer not null default 0,
  failed_rows integer not null default 0,
  credit_cost integer not null default 0,
  -- The shared settings every row inherits.
  settings jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index batch_runs_user_idx on public.batch_runs (user_id, created_at desc);
alter table public.batch_runs enable row level security;

create policy "batch_runs_select_own" on public.batch_runs
  for select using (auth.uid() = user_id);
create policy "batch_runs_delete_own" on public.batch_runs
  for delete using (auth.uid() = user_id);

-- One row of the CSV = one generation.
create table public.batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_run_id uuid not null references public.batch_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_id uuid references public.generations(id) on delete set null,
  row_index integer not null,
  -- Column values from the uploaded CSV, substituted into the prompt template.
  variables jsonb not null default '{}'::jsonb,
  status generation_status not null default 'QUEUED',
  error text,
  created_at timestamptz not null default now()
);

create index batch_items_run_idx on public.batch_items (batch_run_id, row_index);
create index batch_items_status_idx on public.batch_items (status, created_at)
  where status = 'QUEUED';
alter table public.batch_items enable row level security;

create policy "batch_items_select_own" on public.batch_items
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Creative performance
--
-- Closes the loop between a generated asset and how it actually performed.
-- Metrics arrive by CSV import today; an ad-platform connector can write here
-- later without any schema change.
-- ---------------------------------------------------------------------------
create table public.creative_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  output_id uuid not null references public.generation_outputs(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  -- Free-form so any source can be recorded: meta, google, tiktok, shopify, manual.
  source text not null default 'manual',
  campaign text,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions bigint not null default 0,
  spend_cents bigint not null default 0,
  revenue_cents bigint not null default 0,
  recorded_for date not null default current_date,
  created_at timestamptz not null default now(),
  unique (output_id, source, campaign, recorded_for)
);

create index creative_performance_user_idx
  on public.creative_performance (user_id, recorded_for desc);
alter table public.creative_performance enable row level security;

create policy "creative_performance_select_own" on public.creative_performance
  for select using (auth.uid() = user_id);
create policy "creative_performance_insert_own" on public.creative_performance
  for insert with check (auth.uid() = user_id);
create policy "creative_performance_delete_own" on public.creative_performance
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Generation additions for the studio
-- ---------------------------------------------------------------------------
alter table public.generations
  add column if not exists brand_kit_id uuid references public.brand_kits(id) on delete set null,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists batch_item_id uuid,
  add column if not exists scene_id text,
  -- Path to the cut-out product with its alpha channel. Its existence is what
  -- makes the pixel-identical guarantee verifiable after the fact.
  add column if not exists product_mask_path text,
  add column if not exists product_preserved boolean not null default false;

create index generations_brand_kit_idx on public.generations (brand_kit_id);
create index generations_client_idx on public.generations (client_id);

alter table public.generation_outputs
  add column if not exists export_preset text;
