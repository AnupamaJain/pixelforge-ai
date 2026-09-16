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
