-- Orderlink standalone — Phase 4 migration 0004
-- Google Sheet অটো-সিঙ্ক: সেলারের Google টোকেন (এনক্রিপ্ট করা),
-- সিঙ্কের কিউ ও ইতিহাস। 0001–0003-এর টেবিল এখানে নতুন করে
-- বানানো হয়নি।
--
-- নকশার কথা:
-- - টোকেন কখনো plain text-এ থাকে না — Edge Function AES-GCM-এ
--   এনক্রিপ্ট করে রাখে (চাবি Edge Function secret SHEET_TOKEN_KEY)।
--   ক্লায়েন্ট কখনো টোকেনের কলাম পড়ে না — শুধু google_email /
--   sheet_id / sheet_url পড়ে।
-- - অর্ডার জমা হলেই trigger কিউতে একটা সারি বসায় — অর্ডারই সত্যের
--   উৎস; সিঙ্ক ব্যর্থ হলেও অর্ডার হারায় না, কিউ থেকে রিট্রাই হয়।
-- - সেলার Google যুক্ত করেনি এমন অর্ডারের sheet_status
--   'not_connected' হয় (0001-এর CHECK-এ এই মানটা যোগ করা হয়েছে)।

-- ============ seller_google_tokens: সেলারের Google সংযোগ ============
-- এক সেলারের একটাই সংযোগ (seller_id unique)। sheet_id null মানে
-- Google যুক্ত হয়েছে কিন্তু Sheet এখনো বাছা হয়নি।
create table public.seller_google_tokens (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique references public.sellers (id) on delete cascade,
  google_email text,
  refresh_token_enc text,
  access_token_enc text,
  access_token_expires_at timestamptz,
  sheet_id text,
  sheet_url text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ sheet_sync_queue: সিঙ্কের সারি ============
-- status: pending (অপেক্ষায়) / processing (চলছে) / synced (হয়েছে) /
-- failed (ব্যর্থ — next_retry_at এলে আবার চেষ্টা হবে) / skipped
-- (Google/Sheet যুক্ত নেই বলে আপাতত বাদ — Sheet যুক্ত হলে pending-এ ফেরে)।
create table public.sheet_sync_queue (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'synced', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  next_retry_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sheet_sync_queue_due_idx
  on public.sheet_sync_queue (status, next_retry_at);

-- ============ sheet_sync_events: সিঙ্কের ইতিহাস ============
-- প্রতিটা সিঙ্কের চেষ্টা (সফল/ব্যর্থ) এখানে একটা সারি লেখে — সেলার
-- Settings → Google Sheets থেকে ইতিহাস দেখতে পারে।
create table public.sheet_sync_events (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null check (status in ('synced', 'pending', 'failed')),
  attempts integer not null default 1 check (attempts >= 1),
  last_error text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index sheet_sync_events_seller_idx
  on public.sheet_sync_events (seller_id, created_at desc);

-- ============ orders.sheet_status: 'not_connected' মান যোগ ============
-- 0001-এর CHECK শুধু pending/synced/failed জানত। Google যুক্ত না
-- থাকলে অর্ডার 'not_connected' হবে — pending-এর সঙ্গে গুলিয়ে যাবে না।
alter table public.orders
  drop constraint if exists orders_sheet_status_check;
alter table public.orders
  add constraint orders_sheet_status_check
  check (sheet_status in ('pending', 'synced', 'failed', 'not_connected'));

-- ============ অর্ডার জমলেই কিউতে সারি ============
-- কাস্টমার লগইন ছাড়া অর্ডার দেয় (anon) — তাই trigger ফাংশন
-- SECURITY DEFINER: কিউতে লেখা RLS-এ আটকাবে না। একই অর্ডারের
-- দ্বিতীয় সারি কখনো হবে না (order_id unique + on conflict)।
create or replace function public.enqueue_sheet_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sheet_sync_queue (seller_id, order_id, status)
  values (new.seller_id, new.id, 'pending')
  on conflict (order_id) do nothing;
  return new;
end;
$$;

create trigger orders_enqueue_sheet_sync
  after insert on public.orders
  for each row execute function public.enqueue_sheet_sync();

-- ============ updated_at triggers ============
create trigger seller_google_tokens_set_updated_at
  before update on public.seller_google_tokens
  for each row execute function public.set_updated_at();
create trigger sheet_sync_queue_set_updated_at
  before update on public.sheet_sync_queue
  for each row execute function public.set_updated_at();

-- ============ Row Level Security ============
-- টোকেন/কিউ/ইতিহাস — সব শুধু মালিকের। টোকেন লেখে শুধু Edge
-- Function (service-role key); ক্লায়েন্ট টোকেনের কলাম পড়ে না।
alter table public.seller_google_tokens enable row level security;
alter table public.sheet_sync_queue enable row level security;
alter table public.sheet_sync_events enable row level security;

create policy seller_google_tokens_owner_select on public.seller_google_tokens
  for select using (seller_id = auth.uid());

create policy sheet_sync_queue_owner_select on public.sheet_sync_queue
  for select using (seller_id = auth.uid());
-- Sheet যুক্ত হলে skipped সারি pending-এ ফেরাতে ক্লায়েন্টকে
-- নিজের কিউ আপডেট করতে হয় (sheets-setup Edge Function-ও করে)।
create policy sheet_sync_queue_owner_update on public.sheet_sync_queue
  for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());

create policy sheet_sync_events_owner_select on public.sheet_sync_events
  for select using (seller_id = auth.uid());
