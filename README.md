# ألف سوق (Alfsouq)

Arabic marketplace for stores and restaurants: digital menus, offers, and a cart that sends orders over WhatsApp.

| Area | Host | Routes | Login |
|---|---|---|---|
| Customers | `alfsouq.com` | `/`, `/m/[slug]`, `/offers` | None. Orders go out over WhatsApp |
| Store owners | `partner.alfsouq.com` | `/dashboard`, `/restaurant-panel/[id]` | Phone SMS |
| Platform admin | `admin.alfsouq.com` | `/admin` | Email and password |

Stack: Next.js 16, React 19, Tailwind 4, Zustand, Supabase (data and sessions), Firebase (SMS only), Cloudinary (images).

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

## Commands

```bash
npm run dev     # development server
npm run build   # production build
npm run lint    # ESLint
npm test        # unit tests
```

## Access control

Row Level Security in Postgres is what protects the data. Customers have no accounts: they read public data and can only insert orders and visits. The checks in the UI only decide what to show.

- Roles live in `app_metadata` on the Supabase user (`role`, `restaurant_id`, `phone`). Only the service role can write them, and they reach RLS through the JWT.
- Phone login: Firebase sends the SMS, then `/api/auth/phone/session` verifies the Firebase ID token and returns a Supabase session with the right role.
- Policies are in `supabase/migrations/`. Earlier migrations were applied from the dashboard and aren't in this repo. `supabase/manual/` holds statements to run by hand.
- Store access follows the `profiles` row, so reassigning a store revokes the old owner immediately.
- Some columns are hidden with allow-list grants, so a new column on `restaurants`, `ratings` or `platform_settings` stays hidden from the public until it is granted.

Make a user a platform admin in the Supabase SQL editor, then sign in again:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
where email = 'someone@example.com';
```

## Caching

Public pages read through `unstable_cache` in `src/utils/menuCache.ts`, tagged by store. Saving in a panel calls `/api/revalidate`, which invalidates those tags for every server instance.

## Images

Images live on Cloudinary and the database stores URLs. `scripts/maintenance/` has the one-off migration that moved old base64 images.

## Seed scripts

Demo data scripts in `scripts/seed/` need the service role key:

```bash
node --env-file=.env.local scripts/seed/seed.mjs
```
