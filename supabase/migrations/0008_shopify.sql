-- Shopify app installs.
--
-- One row per installed shop. The access token is a durable credential that
-- can read and write a merchant's catalogue, so this table is service-role
-- only: there is no RLS policy granting any client access to it at all.

create table public.shopify_installs (
  id uuid primary key default gen_random_uuid(),
  shop_domain text not null unique,
  -- Offline access token. Treated like a password: never returned to a client.
  access_token text not null,
  scope text not null,
  -- Set once a merchant links the install to a PixelForge account. Until then
  -- the install exists but has no user, which is the normal post-OAuth state.
  user_id uuid references auth.users(id) on delete set null,
  -- Shopify billing is separate from Stripe; App Store apps may not use Stripe.
  shopify_charge_id text,
  plan plan_id not null default 'FREE',
  billing_status text,
  installed_at timestamptz not null default now(),
  uninstalled_at timestamptz,
  updated_at timestamptz not null default now()
);

create index shopify_installs_user_idx on public.shopify_installs (user_id);
create index shopify_installs_active_idx
  on public.shopify_installs (shop_domain) where uninstalled_at is null;

alter table public.shopify_installs enable row level security;
-- Deliberately no policies. Only the service role touches this table.

-- Records compliance webhook deliveries so a data request can be evidenced
-- during App Store review and afterwards.
create table public.shopify_compliance_events (
  id uuid primary key default gen_random_uuid(),
  shop_domain text not null,
  topic text not null,
  payload jsonb not null,
  handled_at timestamptz not null default now()
);

create index shopify_compliance_shop_idx
  on public.shopify_compliance_events (shop_domain, handled_at desc);

alter table public.shopify_compliance_events enable row level security;

-- Links a generated output back to the Shopify product it was published to,
-- so the UI can show what has already been pushed and avoid duplicates.
create table public.shopify_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  output_id uuid not null references public.generation_outputs(id) on delete cascade,
  shop_domain text not null,
  shopify_product_id text not null,
  shopify_image_id text,
  published_at timestamptz not null default now(),
  unique (output_id, shopify_product_id)
);

create index shopify_publications_user_idx
  on public.shopify_publications (user_id, published_at desc);

alter table public.shopify_publications enable row level security;

create policy "shopify_publications_select_own" on public.shopify_publications
  for select using (auth.uid() = user_id);
