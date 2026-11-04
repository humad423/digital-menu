-- Lets the admin keep a store off the home page while its direct link keeps working.
alter table public.restaurants add column show_on_home boolean not null default true;

grant select (show_on_home) on public.restaurants to anon, authenticated;
grant update (show_on_home) on public.restaurants to authenticated;

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
     or new.show_on_home is distinct from old.show_on_home then
    raise exception 'Only a platform admin can change these store settings'
      using errcode = '42501';
  end if;
  return new;
end $function$;
