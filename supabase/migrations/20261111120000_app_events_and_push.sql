-- What visitors do with the app itself, for the team's numbers: opening it for the first time on a phone,
-- opening it, visiting the home page, and sharing a store. Anyone can add a row; only the admin reads them.
create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('install', 'app_open', 'home_visit', 'share')),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  from_app boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists app_events_kind_created_at on public.app_events (kind, created_at desc);

alter table public.app_events enable row level security;
revoke all on public.app_events from anon, authenticated;
grant insert (kind, restaurant_id, from_app) on public.app_events to anon, authenticated;
grant select on public.app_events to authenticated;

create policy app_events_public_insert on public.app_events
  for insert to anon, authenticated
  with check (true);

create policy app_events_admin_read on public.app_events
  for select to authenticated
  using ((select app_private.is_admin()));

-- Phones that asked to hear about offers near them. Only the site's own server reads or writes these;
-- the location is rounded to about a kilometre and is only used to pick who hears about a store's offer.
create table if not exists public.push_subscriptions (
  endpoint text primary key check (endpoint like 'https://%' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated;

create policy push_subscriptions_admin_read on public.push_subscriptions
  for select to authenticated
  using ((select app_private.is_admin()));
