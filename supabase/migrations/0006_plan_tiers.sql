-- Extends plan_id for the four-tier pricing structure.
--
-- 0001 created this enum as (FREE, PRO) when the product had two tiers. The
-- pricing restructure introduced STARTER / GROWTH / AGENCY in config/plans.ts,
-- but the enum was never widened — so subscriptions.plan and profiles.plan
-- would reject every paid tier, and the Stripe webhook would fail silently at
-- the moment a customer upgraded.
--
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction, so this is its own
-- migration. 'PRO' is left in place: existing rows may reference it, and
-- removing an enum value requires rewriting the type.

alter type plan_id add value if not exists 'STARTER';
alter type plan_id add value if not exists 'GROWTH';
alter type plan_id add value if not exists 'AGENCY';
