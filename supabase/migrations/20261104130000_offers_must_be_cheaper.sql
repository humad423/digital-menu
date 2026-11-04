-- A discount has to be a real one, whoever saves it: the panel, the admin or the WhatsApp assistant.
-- Only checked when a price changes, so hiding or editing an older offer keeps working.
create or replace function app_private.enforce_real_discount()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  current_price numeric;
begin
  if tg_table_name = 'offers' then
    if tg_op = 'UPDATE'
       and new.offer_price is not distinct from old.offer_price
       and new.original_price is not distinct from old.original_price then
      return new;
    end if;
    if new.original_price is null or new.offer_price is null or new.offer_price <= 0 or new.offer_price >= new.original_price then
      raise exception 'The offer price must be above zero and below the original price'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.price is not distinct from old.price
     and new.original_price is not distinct from old.original_price then
    return new;
  end if;
  current_price := new.price;
  if coalesce(new.original_price, 0) > 0 and current_price >= new.original_price then
    raise exception 'The price must be below the price before the discount'
      using errcode = '23514';
  end if;
  return new;
end
$function$;

drop trigger if exists enforce_real_discount on public.offers;
create trigger enforce_real_discount
  before insert or update on public.offers
  for each row execute function app_private.enforce_real_discount();

drop trigger if exists enforce_real_discount on public.menu_items;
create trigger enforce_real_discount
  before insert or update on public.menu_items
  for each row execute function app_private.enforce_real_discount();
