-- Counts presses on a store's message button, so the owner can see people really getting in touch.
create table if not exists public.contact_clicks (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists contact_clicks_store_time on public.contact_clicks (restaurant_id, created_at desc);

alter table public.contact_clicks enable row level security;

-- Visitors can only add a press for a store that is running; only the store and admins read them
drop policy if exists contact_clicks_public_insert on public.contact_clicks;
create policy contact_clicks_public_insert on public.contact_clicks
  for insert to anon, authenticated
  with check (exists (select 1 from public.restaurants r where r.id = contact_clicks.restaurant_id and coalesce(r.is_subscription_active, true)));

drop policy if exists contact_clicks_store_read on public.contact_clicks;
create policy contact_clicks_store_read on public.contact_clicks
  for select to authenticated
  using (app_private.can_view_restaurant(restaurant_id));

revoke all on public.contact_clicks from anon, authenticated;
grant insert (restaurant_id) on public.contact_clicks to anon, authenticated;
grant select on public.contact_clicks to authenticated;
