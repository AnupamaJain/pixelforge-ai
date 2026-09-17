-- Aligns the welcome grant with config/plans.ts.
--
-- handle_new_user() defaulted to 50 credits, left over from the original
-- two-tier pricing. config/plans.ts now defaults FREE to 30, and the landing
-- page, pricing page and FAQ all render that number from config — so a new
-- user was promised 30 and silently given 50.
--
-- The value still reads from the `app.free_monthly_credits` database setting
-- first, so an operator who changes FREE_MONTHLY_CREDITS can keep the two in
-- step with:
--   alter database postgres set app.free_monthly_credits = '<n>';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  starting_credits integer := coalesce(
    nullif(current_setting('app.free_monthly_credits', true), '')::integer,
    30
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
