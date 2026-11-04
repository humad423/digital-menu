-- WhatsApp assistant for store owners. Everything is reached only through the
-- store-assistant edge function with the service role, so there are no public policies.

-- Which numbers may update which stores. A store only joins the assistant by being listed here.
create table public.assistant_numbers (
  phone text not null,
  store_id uuid not null references public.restaurants (id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (phone, store_id)
);

create table public.assistant_chats (
  phone text primary key,
  store_id uuid references public.restaurants (id) on delete set null,
  history jsonb not null default '[]'::jsonb,
  pending jsonb,
  pending_at timestamptz,
  version integer not null default 0,
  updated_at timestamptz not null default now()
);

-- The owner's own names for products, learned from what they confirm
create table public.assistant_aliases (
  store_id uuid not null references public.restaurants (id) on delete cascade,
  said text not null,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, said)
);

-- Every change the assistant makes, with what was there before, so it can be undone
create table public.assistant_changes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.restaurants (id) on delete cascade,
  phone text not null,
  action text not null,
  target_table text not null,
  target_id uuid not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
create index assistant_changes_phone_recent_idx on public.assistant_changes (phone, created_at desc);

-- WhatsApp can deliver the same message twice
create table public.assistant_seen (
  message_id text primary key,
  created_at timestamptz not null default now()
);

create table public.assistant_usage (
  day date primary key,
  calls integer not null default 0
);

alter table public.assistant_numbers enable row level security;
alter table public.assistant_chats enable row level security;
alter table public.assistant_aliases enable row level security;
alter table public.assistant_changes enable row level security;
alter table public.assistant_seen enable row level security;
alter table public.assistant_usage enable row level security;

revoke all on public.assistant_numbers, public.assistant_chats, public.assistant_aliases,
  public.assistant_changes, public.assistant_seen, public.assistant_usage from anon, authenticated;

grant all on public.assistant_numbers, public.assistant_chats, public.assistant_aliases,
  public.assistant_changes, public.assistant_seen, public.assistant_usage to service_role;

-- Counts one AI call and says whether today's limit still allows it
create function public.assistant_count_call(daily_limit integer)
returns boolean
language sql
security definer
set search_path = ''
as $$
  insert into public.assistant_usage as usage (day, calls)
  values (current_date, 1)
  on conflict (day) do update set calls = usage.calls + 1
  returning calls <= daily_limit;
$$;

revoke all on function public.assistant_count_call(integer) from public, anon, authenticated;
grant execute on function public.assistant_count_call(integer) to service_role;
