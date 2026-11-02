-- Replaces every open "public" policy with role-based access.
--
-- Roles come from auth.users.raw_app_meta_data, which only the service role can
-- write, and reach Postgres through the JWT:
--   app_metadata.role           'admin' | 'restaurant_owner' | 'customer'
--   app_metadata.restaurant_id  the store a restaurant_owner manages
--   app_metadata.phone          the phone number verified at login
--
-- Column-level grants below are allow-lists: a new column on restaurants, ratings
-- or platform_settings stays hidden from the public until it is granted here.

create schema if not exists app_private;
grant usage on schema app_private to anon, authenticated;

create or replace function app_private.is_admin()
returns boolean language sql stable set search_path = ''
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' $$;

create or replace function app_private.owned_restaurant_id()
returns uuid language sql stable set search_path = ''
as $$
  select case
    when auth.jwt() -> 'app_metadata' ->> 'role' = 'restaurant_owner'
    then nullif(auth.jwt() -> 'app_metadata' ->> 'restaurant_id', '')::uuid
  end
$$;

create or replace function app_private.verified_phone()
returns text language sql stable set search_path = ''
as $$ select nullif(auth.jwt() -> 'app_metadata' ->> 'phone', '') $$;

-- Read access survives a suspended subscription so owners keep their history.
create or replace function app_private.can_view_restaurant(rid uuid)
returns boolean language sql stable set search_path = ''
as $$ select app_private.is_admin() or app_private.owned_restaurant_id() = rid $$;

-- Write access for owners requires an active subscription.
create or replace function app_private.can_manage_restaurant(rid uuid)
returns boolean language sql stable set search_path = ''
as $$
  select app_private.is_admin() or (
    app_private.owned_restaurant_id() = rid
    and exists (
      select 1 from public.restaurants r
      where r.id = rid and coalesce(r.is_subscription_active, true)
    )
  )
$$;

create or replace function app_private.can_manage_category(cid uuid)
returns boolean language sql stable set search_path = ''
as $$
  select app_private.can_manage_restaurant(
    (select c.restaurant_id from public.categories c where c.id = cid)
  )
$$;

-- Drop every existing policy on the public tables and the storage bucket.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
       or (schemaname = 'storage' and tablename = 'objects'
           and policyname in ('Public Access', 'Public Upload', 'Public Delete'))
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Tables that were fully exposed. Neither is used by the app with these columns.
alter table public.platform_settings enable row level security;
alter table public.otp_verifications enable row level security;

revoke all on public.otp_verifications from anon, authenticated;

alter table public.platform_settings alter column whatsapp_token drop default;
revoke all on public.platform_settings from anon, authenticated;
grant select (id, coverage_lat, coverage_lng, coverage_radius_km, is_geofencing_enabled,
              updated_at, privacy_policy, terms_of_service, about_us)
  on public.platform_settings to anon, authenticated;
grant update (coverage_lat, coverage_lng, coverage_radius_km, is_geofencing_enabled,
              updated_at, privacy_policy, terms_of_service, about_us)
  on public.platform_settings to authenticated;

create policy "settings_public_read" on public.platform_settings
  for select to anon, authenticated using (true);
create policy "settings_admin_update" on public.platform_settings
  for update to authenticated
  using ((select app_private.is_admin())) with check ((select app_private.is_admin()));

-- Restaurants: public storefront columns, internal notes for signed-in staff only.
revoke select on public.restaurants from anon;
grant select (id, created_at, name, slug, primary_color, whatsapp_number, logo_url,
              platform_category_id, cover_url, latitude, longitude, delivery_radius_km,
              delivery_tiers, store_type, has_delivery, max_offers_limit, opening_time,
              closing_time, days_off, is_on_holiday, enable_whatsapp_orders,
              is_subscription_active, is_menu_active, menu_note, holiday_message)
  on public.restaurants to anon;

create policy "restaurants_public_read" on public.restaurants
  for select to anon, authenticated using (true);
create policy "restaurants_admin_insert" on public.restaurants
  for insert to authenticated with check ((select app_private.is_admin()));
create policy "restaurants_manage_update" on public.restaurants
  for update to authenticated
  using (app_private.can_manage_restaurant(id))
  with check (app_private.can_manage_restaurant(id));
create policy "restaurants_admin_delete" on public.restaurants
  for delete to authenticated using ((select app_private.is_admin()));

-- Owners cannot change what the platform controls about their store.
create or replace function app_private.guard_restaurant_columns()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or app_private.is_admin() then
    return new;
  end if;
  if new.slug is distinct from old.slug
     or new.is_subscription_active is distinct from old.is_subscription_active
     or new.is_menu_active is distinct from old.is_menu_active
     or new.subscription_notes is distinct from old.subscription_notes
     or new.max_offers_limit is distinct from old.max_offers_limit then
    raise exception 'Only a platform admin can change these store settings'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists guard_restaurant_columns on public.restaurants;
create trigger guard_restaurant_columns before update on public.restaurants
  for each row execute function app_private.guard_restaurant_columns();

-- Store content.
create policy "categories_public_read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories_manage_insert" on public.categories
  for insert to authenticated with check (app_private.can_manage_restaurant(restaurant_id));
create policy "categories_manage_update" on public.categories
  for update to authenticated
  using (app_private.can_manage_restaurant(restaurant_id))
  with check (app_private.can_manage_restaurant(restaurant_id));
create policy "categories_manage_delete" on public.categories
  for delete to authenticated using (app_private.can_manage_restaurant(restaurant_id));

create policy "menu_items_public_read" on public.menu_items
  for select to anon, authenticated using (true);
create policy "menu_items_manage_insert" on public.menu_items
  for insert to authenticated with check (app_private.can_manage_category(category_id));
create policy "menu_items_manage_update" on public.menu_items
  for update to authenticated
  using (app_private.can_manage_category(category_id))
  with check (app_private.can_manage_category(category_id));
create policy "menu_items_manage_delete" on public.menu_items
  for delete to authenticated using (app_private.can_manage_category(category_id));

create policy "offers_public_read" on public.offers
  for select to anon, authenticated using (true);
create policy "offers_manage_insert" on public.offers
  for insert to authenticated with check (app_private.can_manage_restaurant(restaurant_id));
create policy "offers_manage_update" on public.offers
  for update to authenticated
  using (app_private.can_manage_restaurant(restaurant_id))
  with check (app_private.can_manage_restaurant(restaurant_id));
create policy "offers_manage_delete" on public.offers
  for delete to authenticated using (app_private.can_manage_restaurant(restaurant_id));

-- Orders: anyone can place one, only the store and admins can read it.
create policy "orders_public_insert" on public.orders
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and total_price >= 0
    and jsonb_typeof(items) = 'array'
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and coalesce(r.is_subscription_active, true)
    )
  );
create policy "orders_store_read" on public.orders
  for select to authenticated using (app_private.can_view_restaurant(restaurant_id));
create policy "orders_store_update" on public.orders
  for update to authenticated
  using (app_private.can_view_restaurant(restaurant_id))
  with check (app_private.can_view_restaurant(restaurant_id));
create policy "orders_admin_delete" on public.orders
  for delete to authenticated using ((select app_private.is_admin()));

-- Profiles: phone numbers are private. Rows are created by the login route.
create policy "profiles_self_or_admin_read" on public.profiles
  for select to authenticated
  using (phone = (select app_private.verified_phone()) or (select app_private.is_admin()));
create policy "profiles_admin_insert" on public.profiles
  for insert to authenticated with check ((select app_private.is_admin()));
create policy "profiles_self_or_admin_update" on public.profiles
  for update to authenticated
  using (phone = (select app_private.verified_phone()) or (select app_private.is_admin()))
  with check (phone = (select app_private.verified_phone()) or (select app_private.is_admin()));
create policy "profiles_admin_delete" on public.profiles
  for delete to authenticated using ((select app_private.is_admin()));

create or replace function app_private.guard_profile_columns()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or app_private.is_admin() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.phone is distinct from old.phone
     or new.role is distinct from old.role
     or new.restaurant_id is distinct from old.restaurant_id then
    raise exception 'Only a platform admin can change these profile fields'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_columns on public.profiles;
create trigger guard_profile_columns before update on public.profiles
  for each row execute function app_private.guard_profile_columns();

-- Ratings: public reviews without the reviewer's phone number.
revoke select on public.ratings from anon, authenticated;
grant select (id, created_at, restaurant_id, user_name, rating, comment)
  on public.ratings to anon, authenticated;

create policy "ratings_public_read" on public.ratings
  for select to anon, authenticated using (true);
create policy "ratings_verified_insert" on public.ratings
  for insert to authenticated
  with check (user_phone = (select app_private.verified_phone()));
create policy "ratings_admin_delete" on public.ratings
  for delete to authenticated using ((select app_private.is_admin()));

-- Visit tracking: public write, store-only read.
create policy "qr_scans_public_insert" on public.qr_scans
  for insert to anon, authenticated
  with check (length(coalesce(user_agent, '')) <= 1000);
create policy "qr_scans_store_read" on public.qr_scans
  for select to authenticated using (app_private.can_view_restaurant(restaurant_id));

-- Platform-wide content: public read, admin write.
do $$
declare t text;
begin
  foreach t in array array[
    'ads', 'platform_ads', 'platform_categories', 'restaurant_platform_categories',
    'service_zones', 'business_types'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_public_read', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select app_private.is_admin())) with check ((select app_private.is_admin()))',
      t || '_admin_write', t);
  end loop;
end $$;

-- Images are served by Cloudinary; the bucket keeps public read only.
create policy "menu_images_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'menu-images');
