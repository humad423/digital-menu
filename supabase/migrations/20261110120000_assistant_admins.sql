-- Numbers the WhatsApp assistant treats as the Alfsouq admin: they can work on any store and open new ones.
-- Kept out of the code. Only the assistant's own function, with the service role, reads it.
create table if not exists public.assistant_admins (
  phone text primary key check (phone ~ '^[0-9]{9,15}$'),
  created_at timestamptz not null default now()
);

alter table public.assistant_admins enable row level security;
revoke all on public.assistant_admins from anon, authenticated;
