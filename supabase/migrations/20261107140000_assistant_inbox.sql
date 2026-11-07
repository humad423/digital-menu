-- Owners often send one thought in pieces: "ضيف كنافة", then "بـ 50", then a photo.
-- Each message waits here a few seconds; only the last one in a row answers, for all of them together.
create table if not exists public.assistant_inbox (
  message_id text primary key,
  phone text not null,
  kind text not null,
  text text,
  media_url text,
  mime_type text,
  received_at timestamptz not null default now(),
  -- Set when one answer takes this message, and when that answer is sent
  taken_at timestamptz,
  done_at timestamptz
);

create index if not exists assistant_inbox_phone_received on public.assistant_inbox (phone, received_at);

-- Only the assistant's own function, with the service role, reads or writes it
alter table public.assistant_inbox enable row level security;
revoke all on public.assistant_inbox from anon, authenticated;
