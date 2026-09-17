-- ============================================================================
-- PixelForge AI — complete schema, all migrations combined
--
-- HOW TO RUN
--   1. Open your Supabase project -> SQL Editor -> New query
--   2. Paste this entire file
--   3. Run
--
-- Safe to run once on a fresh project. Running it twice will error on the
-- CREATE TYPE statements, which is intentional — it stops you silently
-- re-running DDL over a live database.
--
-- NOTE ON 0004: `ALTER TYPE ... ADD VALUE` cannot be used in the same
-- transaction that adds it. The SQL Editor runs each statement separately, so
-- pasting this whole file works. If you script it, run 0004 as its own step.
-- ============================================================================



-- ==========================================================================
-- 0001_init.sql
-- ==========================================================================

-- PixelForge AI — core schema
-- Security model: every user-facing table is RLS-protected and scoped to auth.uid().
-- Credit balances and subscription rows are READ-ONLY to clients; only the
-- service role (server-side) may mutate them.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type generation_type as enum ('TEXT_TO_IMAGE', 'IMAGE_TO_IMAGE', 'UPSCALE');
create type generation_status as enum ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
create type plan_id as enum ('FREE', 'PRO');
create type credit_transaction_type as enum (
  'PURCHASE', 'SUBSCRIPTION', 'GENERATION', 'UPSCALE', 'REFUND', 'ADMIN_ADJUSTMENT'
);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  plan plan_id not null default 'FREE',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Users may edit their display name, but NOT their plan. The trigger below
-- pins `plan` to its stored value on any client-originated update.
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only the service role may change plan. Detected via the absence of a JWT sub.
  if new.plan is distinct from old.plan
     and current_setting('request.jwt.claims', true) is not null
     and coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role'
  then
    new.plan := old.plan;
  end if;
  return new;
end;
$$;

create trigger protect_profile_plan_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_plan();

-- ---------------------------------------------------------------------------
-- Subscriptions (server-writable only)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan plan_id not null default 'FREE',
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create index subscriptions_customer_idx on public.subscriptions (stripe_customer_id);
alter table public.subscriptions enable row level security;

-- Read-only to the owner. No insert/update/delete policy exists, so clients
-- can never write here; the service role bypasses RLS entirely.
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Credit balances (server-writable only)
-- ---------------------------------------------------------------------------
create table public.credit_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_granted integer not null default 0,
  lifetime_spent integer not null default 0,
  last_granted_period text,
  updated_at timestamptz not null default now()
);

alter table public.credit_balances enable row level security;

create policy "credit_balances_select_own" on public.credit_balances
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Credit ledger (append-only, server-writable only)
-- ---------------------------------------------------------------------------
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type credit_transaction_type not null,
  amount integer not null,
  balance_after integer not null,
  generation_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create index credit_transactions_user_idx
  on public.credit_transactions (user_id, created_at desc);

alter table public.credit_transactions enable row level security;

create policy "credit_transactions_select_own" on public.credit_transactions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Generations
-- ---------------------------------------------------------------------------
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type generation_type not null,
  status generation_status not null default 'QUEUED',
  prompt text not null,
  negative_prompt text,
  style_id text,
  provider text not null,
  model text not null,
  width integer,
  height integer,
  seed bigint,
  steps integer,
  guidance real,
  strength real,
  upscale_factor integer,
  image_count integer not null default 1,
  credit_cost integer not null default 0,
  source_image_path text,
  parent_generation_id uuid references public.generations(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index generations_user_created_idx
  on public.generations (user_id, created_at desc);
create index generations_user_type_idx
  on public.generations (user_id, type, created_at desc);

alter table public.generations enable row level security;

create policy "generations_select_own" on public.generations
  for select using (auth.uid() = user_id);
create policy "generations_delete_own" on public.generations
  for delete using (auth.uid() = user_id);
-- Inserts and status updates happen server-side only, after credit checks.

-- ---------------------------------------------------------------------------
-- Generation outputs
-- ---------------------------------------------------------------------------
create table public.generation_outputs (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  width integer not null,
  height integer not null,
  seed bigint,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create index generation_outputs_generation_idx
  on public.generation_outputs (generation_id);
create index generation_outputs_user_created_idx
  on public.generation_outputs (user_id, created_at desc);
create index generation_outputs_favorite_idx
  on public.generation_outputs (user_id, is_favorite) where is_favorite;

alter table public.generation_outputs enable row level security;

create policy "generation_outputs_select_own" on public.generation_outputs
  for select using (auth.uid() = user_id);
-- Favouriting is the one field users may toggle directly.
create policy "generation_outputs_update_own" on public.generation_outputs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "generation_outputs_delete_own" on public.generation_outputs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Generation jobs (queue)
-- ---------------------------------------------------------------------------
create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_id uuid not null references public.generations(id) on delete cascade,
  status generation_status not null default 'QUEUED',
  provider text not null,
  priority integer not null default 0,
  attempts integer not null default 0,
  input jsonb not null,
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index generation_jobs_status_idx
  on public.generation_jobs (status, priority desc, created_at);
create index generation_jobs_generation_idx
  on public.generation_jobs (generation_id);

alter table public.generation_jobs enable row level security;

create policy "generation_jobs_select_own" on public.generation_jobs
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Prompt history
-- ---------------------------------------------------------------------------
create table public.prompt_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_id uuid references public.generations(id) on delete cascade,
  type generation_type not null,
  prompt text not null,
  negative_prompt text,
  style_id text,
  model text,
  status generation_status not null default 'QUEUED',
  created_at timestamptz not null default now()
);

create index prompt_history_user_created_idx
  on public.prompt_history (user_id, created_at desc);
-- Trigram-free search: a simple tsvector index keeps history search fast.
create index prompt_history_search_idx
  on public.prompt_history using gin (to_tsvector('english', prompt));

alter table public.prompt_history enable row level security;

create policy "prompt_history_select_own" on public.prompt_history
  for select using (auth.uid() = user_id);
create policy "prompt_history_delete_own" on public.prompt_history
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Stripe event idempotency
-- ---------------------------------------------------------------------------
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- No policies: service role only.


-- ==========================================================================
-- 0002_credits_and_triggers.sql
-- ==========================================================================

-- Atomic credit operations + account bootstrapping.
--
-- All credit mutation goes through these SECURITY DEFINER functions. They take
-- a row-level lock on credit_balances, so two concurrent generate requests can
-- never spend the same credits (the second blocks until the first commits).

-- ---------------------------------------------------------------------------
-- Bootstrap a new auth user: profile + balance + subscription + starting grant
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  starting_credits integer := coalesce(
    nullif(current_setting('app.free_monthly_credits', true), '')::integer,
    50
  );
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.credit_balances (user_id, balance, lifetime_granted, last_granted_period)
  values (new.id, starting_credits, starting_credits, to_char(now(), 'YYYY-MM'))
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'FREE', 'active')
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (user_id, type, amount, balance_after, description)
  values (new.id, 'SUBSCRIPTION', starting_credits, starting_credits, 'Welcome grant (Free plan)');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Spend credits atomically.
-- Returns the new balance, or raises `insufficient_credits`.
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_type credit_transaction_type,
  p_generation_id uuid default null,
  p_description text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
  new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'Spend amount must be positive' using errcode = 'check_violation';
  end if;

  -- FOR UPDATE serialises concurrent spends for this user.
  select balance into current_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'No credit balance for user %', p_user_id using errcode = 'no_data_found';
  end if;

  if current_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  new_balance := current_balance - p_amount;

  update public.credit_balances
  set balance = new_balance,
      lifetime_spent = lifetime_spent + p_amount,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.credit_transactions
    (user_id, type, amount, balance_after, generation_id, description)
  values
    (p_user_id, p_type, -p_amount, new_balance, p_generation_id, p_description);

  return new_balance;
end;
$$;

-- ---------------------------------------------------------------------------
-- Refund credits atomically. Idempotent per generation: a second refund for the
-- same generation_id is a no-op, so retried failure handlers cannot double-credit.
-- ---------------------------------------------------------------------------
create or replace function public.refund_credits(
  p_user_id uuid,
  p_amount integer,
  p_generation_id uuid,
  p_description text default 'Refund for failed generation'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
  new_balance integer;
  already_refunded integer;
begin
  if p_amount <= 0 then
    return (select balance from public.credit_balances where user_id = p_user_id);
  end if;

  select count(*) into already_refunded
  from public.credit_transactions
  where generation_id = p_generation_id and type = 'REFUND';

  if already_refunded > 0 then
    return (select balance from public.credit_balances where user_id = p_user_id);
  end if;

  select balance into current_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    return null;
  end if;

  new_balance := current_balance + p_amount;

  update public.credit_balances
  set balance = new_balance,
      lifetime_spent = greatest(0, lifetime_spent - p_amount),
      updated_at = now()
  where user_id = p_user_id;

  insert into public.credit_transactions
    (user_id, type, amount, balance_after, generation_id, description)
  values
    (p_user_id, 'REFUND', p_amount, new_balance, p_generation_id, p_description);

  return new_balance;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grant a monthly allocation. Idempotent per (user, period) so duplicate Stripe
-- webhook deliveries cannot double-grant credits.
-- ---------------------------------------------------------------------------
create or replace function public.grant_monthly_credits(
  p_user_id uuid,
  p_amount integer,
  p_period text,
  p_description text default 'Monthly plan credits'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
  last_period text;
  new_balance integer;
begin
  select balance, last_granted_period into current_balance, last_period
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    insert into public.credit_balances (user_id, balance, lifetime_granted, last_granted_period)
    values (p_user_id, p_amount, p_amount, p_period);

    insert into public.credit_transactions
      (user_id, type, amount, balance_after, description)
    values (p_user_id, 'SUBSCRIPTION', p_amount, p_amount, p_description);

    return p_amount;
  end if;

  -- Already granted for this billing period — nothing to do.
  if last_period is not distinct from p_period then
    return current_balance;
  end if;

  new_balance := current_balance + p_amount;

  update public.credit_balances
  set balance = new_balance,
      lifetime_granted = lifetime_granted + p_amount,
      last_granted_period = p_period,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.credit_transactions
    (user_id, type, amount, balance_after, description)
  values (p_user_id, 'SUBSCRIPTION', p_amount, new_balance, p_description);

  return new_balance;
end;
$$;

-- Clients must never call these directly; only the service role may.
revoke execute on function public.spend_credits(uuid, integer, credit_transaction_type, uuid, text) from anon, authenticated;
revoke execute on function public.refund_credits(uuid, integer, uuid, text) from anon, authenticated;
revoke execute on function public.grant_monthly_credits(uuid, integer, text, text) from anon, authenticated;


-- ==========================================================================
-- 0003_storage.sql
-- ==========================================================================

-- Private storage buckets + per-user isolation policies.
--
-- Both buckets are private. Images reach the browser only through short-lived
-- signed URLs minted server-side, so raw storage paths are never public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('generations', 'generations', false, 26214400,
   array['image/png', 'image/jpeg', 'image/webp']),
  ('uploads', 'uploads', false, 10485760,
   array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Object keys are laid out as: users/{user_id}/...
-- storage.foldername(name) returns the path segments, so element 2 is the uid.
create policy "generations_read_own"
  on storage.objects for select
  using (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "generations_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "uploads_read_own"
  on storage.objects for select
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "uploads_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Writes are performed exclusively by the server using the service role, which
-- bypasses RLS. No insert/update policy is granted to authenticated clients.


-- ==========================================================================
-- 0004_generation_type_enum.sql
-- ==========================================================================

-- Adds the PRODUCT_SCENE generation type.
--
-- ALTER TYPE ... ADD VALUE must be committed before the new value can be used,
-- so it lives in its own migration ahead of 0005.

alter type generation_type add value if not exists 'PRODUCT_SCENE';


-- ==========================================================================
-- 0005_studio.sql
-- ==========================================================================

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
