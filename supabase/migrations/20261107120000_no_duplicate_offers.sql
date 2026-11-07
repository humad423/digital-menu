-- A store can't have two bundles with the same products, or two with the same name: customers can't tell them apart.
-- Hidden bundles count too, so the owner shows the old one again instead of making a copy.
-- Each check runs only when its own columns change, so a pair saved before this can still be hidden, renamed or fixed.

-- The products in a bundle and how many of each, in any order, e.g. "id1x2,id2x1"
create or replace function app_private.offer_products(p1 uuid, q1 integer, p2 uuid, q2 integer, p3 uuid, q3 integer, p4 uuid, q4 integer)
returns text
language sql
immutable
set search_path to ''
as $function$
  select string_agg(item::text || 'x' || amount, ',' order by item::text)
  from (
    select item, sum(coalesce(amount, 1)) as amount
    from (values (p1, q1), (p2, q2), (p3, q3), (p4, q4)) as slot(item, amount)
    where item is not null
    group by item
  ) as products
$function$;

-- So "حلاوة الجبنة" and "حلاوة  الجبنه" count as the same name
create or replace function app_private.comparable_name(value text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select btrim(regexp_replace(translate(lower(coalesce(value, '')), 'أإآةىؤئًٌٍَُِّْـ', 'اااهيوي'), '\s+', ' ', 'g'))
$function$;

revoke all on function app_private.offer_products(uuid, integer, uuid, integer, uuid, integer, uuid, integer) from public, anon, authenticated;
revoke all on function app_private.comparable_name(text) from public, anon, authenticated;

-- Security definer so the check sees every bundle of the store, hidden ones included
create or replace function app_private.prevent_duplicate_offers()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  check_products boolean;
  check_title boolean;
  new_products text;
  clash text;
begin
  if tg_op = 'INSERT' then
    check_products := true;
    check_title := true;
  else
    check_products := (new.primary_item_id, new.min_quantity, new.bonus_item_id, new.bonus_quantity, new.item3_id, new.item3_quantity, new.item4_id, new.item4_quantity)
      is distinct from (old.primary_item_id, old.min_quantity, old.bonus_item_id, old.bonus_quantity, old.item3_id, old.item3_quantity, old.item4_id, old.item4_quantity);
    check_title := new.title is distinct from old.title;
  end if;

  if check_products then
    new_products := app_private.offer_products(new.primary_item_id, new.min_quantity, new.bonus_item_id, new.bonus_quantity, new.item3_id, new.item3_quantity, new.item4_id, new.item4_quantity);
    if new_products is not null then
      select o.title into clash
      from public.offers o
      where o.restaurant_id = new.restaurant_id
        and o.id is distinct from new.id
        and app_private.offer_products(o.primary_item_id, o.min_quantity, o.bonus_item_id, o.bonus_quantity, o.item3_id, o.item3_quantity, o.item4_id, o.item4_quantity) = new_products
      limit 1;
      if found then
        raise exception 'This store already has a bundle with the same products: %', clash using errcode = '23505';
      end if;
    end if;
  end if;

  if check_title and app_private.comparable_name(new.title) <> '' then
    select o.title into clash
    from public.offers o
    where o.restaurant_id = new.restaurant_id
      and o.id is distinct from new.id
      and app_private.comparable_name(o.title) = app_private.comparable_name(new.title)
    limit 1;
    if found then
      raise exception 'This store already has a bundle called %', clash using errcode = '23505';
    end if;
  end if;

  return new;
end
$function$;

revoke all on function app_private.prevent_duplicate_offers() from public, anon, authenticated;

drop trigger if exists prevent_duplicate_offers on public.offers;
create trigger prevent_duplicate_offers
  before insert or update on public.offers
  for each row execute function app_private.prevent_duplicate_offers();
