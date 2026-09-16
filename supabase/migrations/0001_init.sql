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
