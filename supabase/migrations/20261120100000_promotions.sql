-- Offers a store runs on its own products, kept apart from the products themselves.
-- A product holds only its own details and its usual price; a promotion lowers it for a while.
--   price_cut         a new price for a product, or for each of its sizes: prices = [{"item_id", "size", "price"}]
--   category_percent  a percentage off whole categories, leaving out excluded_item_ids
-- When it runs: between starts_at and ends_at when set, and only on days (0 = Sunday) between
-- from_time and until_time on the store's clock when those are set. Empty means always.
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  kind text not null check (kind in ('price_cut', 'category_percent')),
  title text,
  prices jsonb not null default '[]'::jsonb,
  percent numeric check (percent is null or (percent > 0 and percent < 100)),
  category_ids uuid[] not null default '{}',
  excluded_item_ids uuid[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  days smallint[] not null default '{}',
  from_time text check (from_time is null or from_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  until_time text check (until_time is null or until_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at > starts_at),
  check (kind <> 'category_percent' or (percent is not null and cardinality(category_ids) > 0)),
  check (kind <> 'price_cut' or jsonb_array_length(prices) > 0)
);

create index if not exists promotions_restaurant_id_idx on public.promotions (restaurant_id);

alter table public.promotions enable row level security;

-- Customers see a store's offers; only the store and the Alfsouq team change them, as with bundles
create policy promotions_public_read on public.promotions for select to anon, authenticated using (true);
create policy promotions_manage_insert on public.promotions for insert to authenticated
  with check (app_private.can_manage_restaurant(restaurant_id));
create policy promotions_manage_update on public.promotions for update to authenticated
  using (app_private.can_manage_restaurant(restaurant_id))
  with check (app_private.can_manage_restaurant(restaurant_id));
create policy promotions_manage_delete on public.promotions for delete to authenticated
  using (app_private.can_manage_restaurant(restaurant_id));

-- A product's "before" price moves into an offer: the product keeps its usual price, and the
-- lower price it was sold at becomes a price cut. Only real discounts, on products without
-- priced sizes, were ever shown to customers, so only those carry over.
insert into public.promotions (restaurant_id, kind, title, prices)
select c.restaurant_id, 'price_cut', m.name,
       jsonb_build_array(jsonb_build_object('item_id', m.id, 'size', null, 'price', m.price))
from public.menu_items m
join public.categories c on c.id = m.category_id
where m.original_price > m.price
  and m.price > 0
  and not exists (
    select 1 from jsonb_array_elements(case when jsonb_typeof(m.sizes) = 'array' then m.sizes else '[]'::jsonb end) s
    where jsonb_typeof(s) = 'object'
  );

-- In one step, since a product's price may never reach its "before" price while both are set
update public.menu_items m
set price = m.original_price, original_price = null
where m.original_price > m.price
  and m.price > 0
  and not exists (
    select 1 from jsonb_array_elements(case when jsonb_typeof(m.sizes) = 'array' then m.sizes else '[]'::jsonb end) s
    where jsonb_typeof(s) = 'object'
  );

update public.menu_items set original_price = null where original_price is not null;
