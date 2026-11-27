-- Orderlink standalone — Phase 3 migration 0003
-- অর্ডার কোড সিকোয়েন্স (OL-1001…), স্ট্যাটাস পরিবর্তনের ইতিহাস
-- (order_events), অর্ডারে ভেতরের নোট, দোকানে ফ্রি-ডেলিভারি সীমা।
-- 0001/0002-এর টেবিল এখানে নতুন করে বানানো হয়নি।
-- Sheet সিঙ্ক Phase 4-এর — এই মাইগ্রেশনে সিঙ্কের কিছু নেই।

-- ============ অর্ডার কোড: OL-1001 থেকে ============
-- orders.order_code 0001-এ not null unique — কিন্তু কোড বানানোর
-- কোনো ব্যবস্থা ছিল না। এখন সিকোয়েন্স + trigger সেটা করে দেবে:
-- ক্লায়েন্ট order_code না দিলেই চলবে, insert-এর আগে trigger বসিয়ে দেবে।
create sequence public.order_code_seq start with 1001;

create or replace function public.next_order_code()
returns text
language sql
as $$
  select 'OL-' || nextval('public.order_code_seq');
$$;

create or replace function public.assign_order_code()
returns trigger
language plpgsql
as $$
begin
  if new.order_code is null or new.order_code = '' then
    new.order_code := public.next_order_code();
  end if;
  return new;
end;
$$;

create trigger orders_assign_code
  before insert on public.orders
  for each row execute function public.assign_order_code();

-- ============ order_events: স্ট্যাটাস পরিবর্তনের ইতিহাস ============
-- প্রতিবার অর্ডারের স্ট্যাটাস বদলালে trigger এখানে একটা সারি লেখে —
-- কে বদলালো (seller_id), আগের ও নতুন স্ট্যাটাস, কখন। সেলার শুধু
-- নিজের অর্ডারের ইতিহাস দেখতে পারে; কাস্টমার কিছু দেখতে পারে না।
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  old_status text,
  new_status text not null,
  created_at timestamptz not null default now()
);
create index order_events_order_id_idx on public.order_events (order_id, created_at);

create or replace function public.log_order_status_change()
returns trigger
language plpgsql
as $$
begin
  if old.status is distinct from new.status then
    insert into public.order_events (order_id, seller_id, old_status, new_status)
    values (new.id, new.seller_id, old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger orders_log_status_change
  after update of status on public.orders
  for each row execute function public.log_order_status_change();

alter table public.order_events enable row level security;

create policy order_events_owner_select on public.order_events
  for select using (seller_id = auth.uid());
create policy order_events_owner_insert on public.order_events
  for insert with check (seller_id = auth.uid());

-- ============ ডুপ্লিকেট যাচাইয়ের ফাংশন ============
-- কাস্টমার লগইন ছাড়া অর্ডার দেয় বলে সরাসরি orders টেবিল পড়া যায়
-- না (RLS শুধু মালিককে পড়তে দেয়)। এই ফাংশন শুধু জানায়: এই ফোনে
-- এই দোকানে গত ২৪ ঘণ্টায় অর্ডার আছে কি না, থাকলে তার কোড — এর
-- বেশি কোনো তথ্য (নাম, ঠিকানা) ফেরত দেয় না।
create or replace function public.check_recent_order(p_shop_id uuid, p_phone text)
returns table(order_code text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select o.order_code, o.created_at
  from public.orders o
  where o.shop_id = p_shop_id
    and o.customer_phone = p_phone
    and o.created_at >= now() - interval '24 hours'
  order by o.created_at desc
  limit 1;
$$;

-- ============ orders: ভেতরের নোট ============
-- সেলারের নিজের নোট (কাস্টমার দেখতে পারে না)।
alter table public.orders
  add column if not exists internal_notes text not null default '';

-- একই ফোনে ডুপ্লিকেট অর্ডার খোঁজা ও স্ট্যাটাসে ছাঁকার জন্য ইনডেক্স।
create index if not exists orders_customer_phone_idx
  on public.orders (customer_phone);
create index if not exists orders_status_idx
  on public.orders (status);

-- ============ shops: ফ্রি-ডেলিভারি সীমা ============
-- null মানে কোনো সীমা নেই। সীমা থাকলে পণ্যের মোট (ডেলিভারি চার্জ
-- ছাড়া) সীমার সমান বা বেশি হলে ডেলিভারি চার্জ ০ হয় — অর্ডার ফর্মে
-- এটা আসল হিসাবেই প্রয়োগ হয়।
alter table public.shops
  add column if not exists free_delivery_threshold numeric(10, 2)
    check (free_delivery_threshold is null or free_delivery_threshold >= 0);
