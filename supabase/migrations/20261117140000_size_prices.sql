-- Some stores sell one product in several sizes at different prices, like a cake for 8, 12 or 20 people.
-- The team switches this on per store; its products then keep each size and its price in sizes,
-- as [{"name":"وسط","price":850}], where clothing keeps plain size names.
alter table public.restaurants add column if not exists size_prices boolean not null default false;

-- Only the Alfsouq team switches it on or off
create or replace function app_private.guard_restaurant_columns()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if current_user not in ('anon', 'authenticated') or app_private.is_admin() then
    return new;
  end if;
  if new.slug is distinct from old.slug
     or new.is_subscription_active is distinct from old.is_subscription_active
     or new.is_menu_active is distinct from old.is_menu_active
     or new.subscription_notes is distinct from old.subscription_notes
     or new.max_offers_limit is distinct from old.max_offers_limit
     or new.show_on_home is distinct from old.show_on_home
     or new.show_stores_button is distinct from old.show_stores_button
     or new.name is distinct from old.name
     or new.phone is distinct from old.phone
     or new.whatsapp_number is distinct from old.whatsapp_number
     or new.latitude is distinct from old.latitude
     or new.longitude is distinct from old.longitude
     or new.hide_location is distinct from old.hide_location
     or new.size_prices is distinct from old.size_prices
     or new.store_type is distinct from old.store_type
     or new.timezone is distinct from old.timezone then
    raise exception 'Only a platform admin can change these store settings'
      using errcode = '42501';
  end if;
  return new;
end
$function$;
