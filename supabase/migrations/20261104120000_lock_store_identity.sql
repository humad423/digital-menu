-- A store's identity is set by the platform: name, numbers, location and type join the
-- settings only an admin can change. Store owners keep their hours, delivery, images and notes.
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
     or new.store_type is distinct from old.store_type then
    raise exception 'Only a platform admin can change these store settings'
      using errcode = '42501';
  end if;
  return new;
end
$function$;
