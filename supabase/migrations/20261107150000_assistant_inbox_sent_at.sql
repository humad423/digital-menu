-- Messages sent in a row are read in the order the owner sent them, by WhatsApp's own time,
-- since the first one can reach us after the next when the function is starting up.
alter table public.assistant_inbox add column if not exists sent_at bigint;
