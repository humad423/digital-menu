-- Ready-made photos of products that look the same everywhere, like a bottle of cola or water, with no brand on them.
-- Only the name and link live here. The image stays on Cloudinary, once, however many stores use it.
create table if not exists public.stock_photos (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  -- Other names the product goes by, like "بيبسي" or "كولا لترين"
  keywords text[] not null default '{}',
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.stock_photos enable row level security;

-- Store owners pick from them in their panel; only admins change them
drop policy if exists stock_photos_read on public.stock_photos;
create policy stock_photos_read on public.stock_photos
  for select to authenticated
  using (true);

drop policy if exists stock_photos_admin_write on public.stock_photos;
create policy stock_photos_admin_write on public.stock_photos
  for all to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));

revoke all on public.stock_photos from anon, authenticated;
grant select, insert, update, delete on public.stock_photos to authenticated;
