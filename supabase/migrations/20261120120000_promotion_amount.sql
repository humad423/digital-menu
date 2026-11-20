-- A discount on a whole category can be a fixed amount off each product, like 20 ₺, as well as a percent.
--   category_amount  amount off each product in category_ids, leaving out excluded_item_ids
alter table public.promotions add column if not exists amount numeric check (amount is null or amount > 0);

alter table public.promotions drop constraint if exists promotions_kind_check;
alter table public.promotions add constraint promotions_kind_check
  check (kind in ('price_cut', 'category_percent', 'category_amount'));

alter table public.promotions add constraint promotions_category_amount_check
  check (kind <> 'category_amount' or (amount is not null and cardinality(category_ids) > 0));
