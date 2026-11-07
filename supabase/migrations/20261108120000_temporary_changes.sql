-- Delivery can run on its own hours, and a store can change one day, or pause delivery for a while,
-- without touching its usual settings. Both come back on their own when the time passes.

-- Usual delivery hours ("HH:MM"). Empty means delivery runs whenever the store is open.
alter table public.restaurants add column if not exists delivery_from text;
alter table public.restaurants add column if not exists delivery_until text;

-- Changes for one day: a list of {date, closed, open, close, delivery_off, delivery_from, delivery_until, note}
alter table public.restaurants add column if not exists special_days jsonb not null default '[]'::jsonb;

-- Delivery stopped until this moment
alter table public.restaurants add column if not exists delivery_paused_until timestamptz;

-- The whole store closed until this moment, like an hour for prayer or an errand
alter table public.restaurants add column if not exists closed_until timestamptz;

alter table public.restaurants drop constraint if exists restaurants_delivery_hours_valid;
alter table public.restaurants add constraint restaurants_delivery_hours_valid check (
  (delivery_from is null or delivery_from ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
  and (delivery_until is null or delivery_until ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
);

alter table public.restaurants drop constraint if exists restaurants_special_days_list;
alter table public.restaurants add constraint restaurants_special_days_list check (jsonb_typeof(special_days) = 'array');

-- Visitors need them to show when the store is open and when it delivers
grant select (delivery_from, delivery_until, special_days, delivery_paused_until, closed_until) on public.restaurants to anon;
