-- Makes store ownership take effect immediately, enforces the offers limit on the
-- server, and adds the missing foreign key indexes.

-- Access follows the profile row, so reassigning a store revokes the old owner at once
-- instead of when their login token happens to expire.
create or replace function app_private.owned_restaurant_id()
returns uuid language sql stable set search_path = ''
as $$
  select p.restaurant_id
  from public.profiles p
  where auth.jwt() -> 'app_metadata' ->> 'role' = 'restaurant_owner'
    and p.phone = app_private.verified_phone()
    and p.role = 'restaurant_owner'
  limit 1
$$;

-- The offers limit was only checked in the browser
create or replace function app_private.enforce_offer_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  store_limit integer;
  offer_count integer;
begin
  if current_setting('role', true) = 'service_role' or app_private.is_admin() then
    return new;
  end if;
  select coalesce(max_offers_limit, 5) into store_limit from public.restaurants where id = new.restaurant_id;
  select count(*) into offer_count from public.offers where restaurant_id = new.restaurant_id;
  if offer_count >= store_limit then
    raise exception 'Offer limit reached for this store' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists enforce_offer_limit on public.offers;
create trigger enforce_offer_limit before insert on public.offers
  for each row execute function app_private.enforce_offer_limit();

grant execute on all functions in schema app_private to anon, authenticated, service_role;

-- Admin write policies no longer double-count on reads
do $$
declare t text;
begin
  foreach t in array array[
    'platform_ads', 'platform_categories', 'restaurant_platform_categories',
    'service_zones', 'business_types'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select app_private.is_admin()))',
      t || '_admin_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select app_private.is_admin())) with check ((select app_private.is_admin()))',
      t || '_admin_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select app_private.is_admin()))',
      t || '_admin_delete', t);
  end loop;
end $$;

-- Foreign key indexes
create index if not exists categories_restaurant_id_idx on public.categories (restaurant_id);
create index if not exists menu_items_category_id_idx on public.menu_items (category_id);
create index if not exists offers_restaurant_id_idx on public.offers (restaurant_id);
create index if not exists offers_primary_item_id_idx on public.offers (primary_item_id);
create index if not exists offers_bonus_item_id_idx on public.offers (bonus_item_id);
create index if not exists offers_item3_id_idx on public.offers (item3_id);
create index if not exists offers_item4_id_idx on public.offers (item4_id);
create index if not exists orders_restaurant_id_idx on public.orders (restaurant_id);
create index if not exists profiles_restaurant_id_idx on public.profiles (restaurant_id);
create index if not exists ratings_restaurant_id_idx on public.ratings (restaurant_id);
create index if not exists rpc_platform_category_id_idx on public.restaurant_platform_categories (platform_category_id);
