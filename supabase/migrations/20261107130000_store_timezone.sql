-- Each store keeps its own clock, so stores in other countries open, close and come back on their own local time.
-- A named zone like 'Europe/Istanbul', not a fixed offset, so places with summer time stay right all year.
alter table public.restaurants
  add column if not exists timezone text not null default 'Europe/Istanbul';

-- An unknown zone name fails here instead of breaking the store's page
alter table public.restaurants
  drop constraint if exists restaurants_timezone_valid;
alter table public.restaurants
  add constraint restaurants_timezone_valid check ((now() at time zone timezone) is not null);

-- Visitors need it to show whether the store is open
grant select (timezone) on public.restaurants to anon;

-- Like the location, only a platform admin changes it
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
     or new.name is distinct from old.name
     or new.phone is distinct from old.phone
     or new.whatsapp_number is distinct from old.whatsapp_number
     or new.latitude is distinct from old.latitude
     or new.longitude is distinct from old.longitude
     or new.store_type is distinct from old.store_type
     or new.timezone is distinct from old.timezone then
    raise exception 'Only a platform admin can change these store settings'
      using errcode = '42501';
  end if;
  return new;
end
$function$;
