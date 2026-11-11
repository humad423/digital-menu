-- Links the team hands out in ads and posts (alfsouq.com/...?c=code), and what the people who came through
-- each one went on to do. Only the admin creates and reads them; visitors can only add an event to a link that exists.
create table if not exists public.campaign_links (
  code text primary key check (code ~ '^[a-z0-9-]{2,32}$'),
  name text not null check (length(btrim(name)) between 1 and 80),
  target_path text not null check (target_path ~ '^/[A-Za-z0-9/_-]*$' and length(target_path) <= 200),
  created_at timestamptz not null default now()
);

alter table public.campaign_links enable row level security;
revoke all on public.campaign_links from anon, authenticated;
grant select, insert, update, delete on public.campaign_links to authenticated;

create policy campaign_links_admin on public.campaign_links
  for all to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));

-- visitor is a random id kept on the phone, only so the same person isn't counted twice
create table if not exists public.campaign_events (
  id bigint generated always as identity primary key,
  campaign_code text not null references public.campaign_links(code) on update cascade on delete cascade,
  kind text not null check (kind in ('visit', 'store_view', 'contact', 'order', 'install', 'push_on')),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  visitor text not null check (visitor ~ '^[a-z0-9-]{8,40}$'),
  created_at timestamptz not null default now()
);

create index if not exists campaign_events_code_kind on public.campaign_events (campaign_code, kind);

alter table public.campaign_events enable row level security;
revoke all on public.campaign_events from anon, authenticated;
grant insert (campaign_code, kind, restaurant_id, visitor) on public.campaign_events to anon, authenticated;
grant select on public.campaign_events to authenticated;

-- The foreign key already refuses codes that don't exist
create policy campaign_events_public_insert on public.campaign_events
  for insert to anon, authenticated
  with check (true);

create policy campaign_events_admin_read on public.campaign_events
  for select to authenticated
  using ((select app_private.is_admin()));

-- Totals per link and kind, for the admin's table. Runs as the caller, so anyone but the admin gets nothing.
create or replace function public.campaign_stats()
returns table (campaign_code text, kind text, events bigint, visitors bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.campaign_code, e.kind, count(*), count(distinct e.visitor)
  from public.campaign_events e
  group by e.campaign_code, e.kind
$$;

revoke all on function public.campaign_stats() from public, anon;
grant execute on function public.campaign_stats() to authenticated;
