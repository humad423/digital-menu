-- Run by hand in the Supabase SQL editor once the WhatsApp token has been rotated.
-- Permanently deletes tables and columns the app no longer uses, including the
-- WhatsApp credentials and the old OTP rows. It can't be undone.

drop table if exists public.ads;
drop table if exists public.otp_verifications;

alter table public.platform_settings
  drop column if exists whatsapp_phone,
  drop column if exists whatsapp_phone_number_id,
  drop column if exists whatsapp_token,
  drop column if exists whatsapp_waba_id,
  drop column if exists coverage_lat,
  drop column if exists coverage_lng,
  drop column if exists coverage_radius_km,
  drop column if exists is_geofencing_enabled,
  drop column if exists about_us;

alter table public.restaurants drop column if exists platform_category_id;
alter table public.menu_items drop column if exists platform_category_id;
alter table public.offers
  drop column if exists bundle_items,
  drop column if exists target_item_id,
  drop column if exists type;
