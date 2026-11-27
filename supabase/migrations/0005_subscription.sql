-- Orderlink standalone — Phase 5 migration 0005
-- মাসিক সাবস্ক্রিপশন + হাতে পেমেন্ট (bKash/Nagad/Upay + TrxID +
-- অ্যাডমিন অনুমোদন)।
--
-- নিয়ম (অনুমোদিত মডেল — লাইভ অ্যাপের মতো):
-- - একটাই মাসিক সাবস্ক্রিপশন, ঠিক ৪টি প্যাকেজ; প্রতিটায় পুরো
--   প্ল্যাটফর্ম। কোনো পেজ ক্রেডিট, আলাদা হোস্টিং ফি, অর্ডারপ্রতি
--   চার্জ বা কমিশন নেই।
-- - এক পেমেন্ট = অনুমোদনের দিন থেকে ৩০ দিনের পুরো অ্যাক্সেস।
--   মেয়াদ শেষে ৩ দিনের গ্রেস (পুরো অ্যাক্সেস), তারপর ফ্রি সার্ভিস —
--   শুধু ১টি সেলার-বাছা পেজ চালু থাকে, বাকিগুলো সাসপেন্ডেড
--   (কখনো মোছা হয় না); নবায়নে সব আবার চালু হয়।
-- - পেইড সাবস্ক্রিপশন নেই = ফ্রি প্ল্যান (সর্বোচ্চ ১টি সক্রিয় পেজ)।
-- - পেমেন্টের নম্বর অ্যাডমিন আগে বসায় (platform_settings) — নম্বর
--   না থাকলে কেনার পথ বন্ধ থাকে। আসল নম্বর কখনো এই ফাইলে নেই;
--   সিডে খালি রাখা হয়েছে।
-- - ফ্রি প্ল্যানের ১০০ MB স্টোরেজ শুধু কোডের ভেতরের fair-use গার্ড —
--   UI-তে কখনো "ফ্রি প্ল্যানে ১০০ MB" বলে দেখানো যাবে না।

-- ============ platform_settings: অ্যাডমিনের সেটিংস ============
-- key/value — পেমেন্টের নম্বর আর গ্রেসের দিন এখানে থাকে।
-- পড়তে পারে শুধু লগইন করা সেলার; লিখতে পারে শুধু অ্যাডমিন
-- (SQL Editor / Phase 6 অ্যাডমিন প্যানেল) — ক্লায়েন্টের লেখার
-- কোনো পলিসি নেই।
create table public.platform_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- পেমেন্টের নম্বর ইচ্ছে করে খালি — আসল নম্বর লাইভ সেটআপে
-- অ্যাডমিন বসাবে; এই রেপো পাবলিক, তাই এখানে কোনো নম্বর নেই।
insert into public.platform_settings (key, value) values
  ('payment_bkash_number', ''),
  ('payment_nagad_number', ''),
  ('payment_upay_number', ''),
  ('grace_days', '3')
on conflict (key) do nothing;

create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

create policy platform_settings_auth_select on public.platform_settings
  for select using (auth.role() = 'authenticated');

-- ============ subscription_plans: প্যাকেজের ক্যাটালগ ============
-- দাম ও সীমা সবসময় এখান থেকে আসে — UI-তে হার্ডকোড করা যাবে না।
create table public.subscription_plans (
  id text primary key
    check (id in ('starter', 'basic', 'growth', 'business')),
  name text not null,
  price_bdt integer not null check (price_bdt > 0),
  max_pages integer not null check (max_pages > 0),
  storage_mb integer not null check (storage_mb > 0),
  is_recommended boolean not null default false,
  features_bn jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.subscription_plans
  (id, name, price_bdt, max_pages, storage_mb, is_recommended, features_bn, sort_order)
values
  ('starter', 'Starter', 99, 3, 100, false,
    '["৩টি ল্যান্ডিং পেজ", "১০০ MB ছবির স্টোরেজ", "Google Sheet অটো-সিঙ্ক"]'::jsonb, 1),
  ('basic', 'Basic', 199, 5, 250, false,
    '["৫টি ল্যান্ডিং পেজ", "২৫০ MB ছবির স্টোরেজ", "Google Sheet অটো-সিঙ্ক"]'::jsonb, 2),
  ('growth', 'Growth', 399, 10, 500, true,
    '["১০টি ল্যান্ডিং পেজ", "৫০০ MB ছবির স্টোরেজ", "Google Sheet অটো-সিঙ্ক"]'::jsonb, 3),
  ('business', 'Business', 699, 20, 1024, false,
    '["২০টি ল্যান্ডিং পেজ", "১ GB ছবির স্টোরেজ", "Google Sheet অটো-সিঙ্ক"]'::jsonb, 4)
on conflict (id) do nothing;

alter table public.subscription_plans enable row level security;

-- হোমের প্রাইসিং লগইন ছাড়া দেখা যায় — ক্যাটালগ সবার পড়ার মতো।
create policy subscription_plans_public_select on public.subscription_plans
  for select using (true);

-- ============ seller_subscriptions: সেলারের বর্তমান প্ল্যান ============
-- এক সেলারের একটাই বর্তমান সাবস্ক্রিপশন (seller_id unique) —
-- আগেরগুলোর ইতিহাস subscription_history-তে থাকে।
-- status: active (মেয়াদ চলছে) / grace (মেয়াদ শেষ, গ্রেস চলছে) /
-- expired (গ্রেসও শেষ — ফ্রি সার্ভিস)।
create table public.seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique references public.sellers (id) on delete cascade,
  plan_id text not null references public.subscription_plans (id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'grace', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index seller_subscriptions_ends_idx
  on public.seller_subscriptions (status, ends_at);

create trigger seller_subscriptions_set_updated_at
  before update on public.seller_subscriptions
  for each row execute function public.set_updated_at();

alter table public.seller_subscriptions enable row level security;

create policy seller_subscriptions_owner_select on public.seller_subscriptions
  for select using (seller_id = auth.uid());

-- ============ রসিদের নম্বর: OL-RCP-1001, OL-RCP-1002, … ============
create sequence public.receipt_code_seq start with 1001;

-- ============ subscription_payments: TrxID পেমেন্টের আবেদন ============
-- status: pending (যাচাইয়ের অপেক্ষায়) / approved (অনুমোদিত) /
-- rejected (বাতিল — reject_reason লিখতেই হবে)।
-- একই TrxID pending বা approved অবস্থায় দুবার জমা হবে না —
-- partial unique index (বাতিল হওয়া TrxID আবার জমা দেওয়া যায়)।
create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  plan_id text not null references public.subscription_plans (id),
  method text not null check (method in ('bkash', 'nagad', 'upay')),
  trxid text not null,
  amount_bdt integer not null check (amount_bdt > 0),
  sender_number text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  receipt_code text unique,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscription_payments_seller_idx
  on public.subscription_payments (seller_id, created_at desc);
create unique index subscription_payments_trxid_active_idx
  on public.subscription_payments (trxid)
  where status in ('pending', 'approved');

-- TrxID সবসময় বড় হাতের + ছাঁটা আকারে থাকবে — কেস ভেদে
-- ডুপ্লিকেট আটকাতে সার্ভারেই ঠিক করা হয়।
create or replace function public.normalize_payment_trxid()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.trxid := upper(btrim(new.trxid));
  return new;
end;
$$;

create trigger subscription_payments_normalize_trxid
  before insert on public.subscription_payments
  for each row execute function public.normalize_payment_trxid();

create trigger subscription_payments_set_updated_at
  before update on public.subscription_payments
  for each row execute function public.set_updated_at();

alter table public.subscription_payments enable row level security;

create policy subscription_payments_owner_select on public.subscription_payments
  for select using (seller_id = auth.uid());
-- জমা দেয় শুধু মালিক নিজে (Edge Function service-role দিয়ে লেখে,
-- তাতেও RLS বাধা দেয় না); আপডেট শুধু SECURITY DEFINER ফাংশন দিয়ে।
create policy subscription_payments_owner_insert on public.subscription_payments
  for insert with check (seller_id = auth.uid());

-- ============ subscription_history: প্ল্যানের ইতিহাস ============
create table public.subscription_history (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  plan_id text references public.subscription_plans (id),
  action text not null,
  note text,
  created_at timestamptz not null default now()
);
create index subscription_history_seller_idx
  on public.subscription_history (seller_id, created_at desc);

alter table public.subscription_history enable row level security;

create policy subscription_history_owner_select on public.subscription_history
  for select using (seller_id = auth.uid());

-- ============ subscription_usage: ব্যবহারের হিসাব ============
-- refresh_subscription_usage() ফাংশন এটা আবার হিসাব করে বসায় —
-- সক্রিয় পেজ (প্রকাশিত, সাসপেন্ড হয়নি) + ছবির মোট বাইট।
create table public.subscription_usage (
  seller_id uuid primary key references public.sellers (id) on delete cascade,
  active_pages integer not null default 0 check (active_pages >= 0),
  storage_bytes bigint not null default 0 check (storage_bytes >= 0),
  updated_at timestamptz not null default now()
);

alter table public.subscription_usage enable row level security;

create policy subscription_usage_owner_select on public.subscription_usage
  for select using (seller_id = auth.uid());

-- ============ pages.is_suspended: ফ্রি সার্ভিসে বন্ধ পেজ ============
-- is_published সত্যি থাকে (পেজটা ছিল প্রকাশিত), শুধু is_suspended
-- সত্যি হয় — নবায়নে আবার চালু হয়, কখনো মোছা হয় না।
alter table public.pages
  add column if not exists is_suspended boolean not null default false;
create index pages_suspended_idx
  on public.pages (seller_id, is_suspended);

-- ============ সহায়ক ফাংশন ============

-- গ্রেসের দিন — platform_settings থেকে (ভুল/খালি থাকলে ৩ দিন)।
create or replace function public.subscription_grace_days()
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.platform_settings
      where key = 'grace_days' and value ~ '^[0-9]+$'
    )
    then (select value::integer from public.platform_settings where key = 'grace_days')
    else 3
  end;
$$;

-- এখনো কার্যকর পেইড প্ল্যান (মেয়াদ চলছে, বা গ্রেসের মধ্যে) —
-- না থাকলে null = ফ্রি প্ল্যান।
create or replace function public.current_plan_id(p_seller_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select s.plan_id
  from public.seller_subscriptions s
  where s.seller_id = p_seller_id
    and s.status in ('active', 'grace')
    and s.ends_at > now() - (public.subscription_grace_days() || ' days')::interval
  order by s.ends_at desc
  limit 1;
$$;

-- কার্যকর পেজের সীমা — পেইড প্ল্যানেরটা, না থাকলে ফ্রি = ১টি।
create or replace function public.effective_page_limit(p_seller_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select p.max_pages
     from public.subscription_plans p
     where p.id = public.current_plan_id(p_seller_id)),
    1);
$$;

-- কার্যকর স্টোরেজের সীমা (MB) — পেইড প্ল্যানেরটা, না থাকলে ১০০।
-- ফ্রির ১০০ MB শুধু কোডের ভেতরের fair-use গার্ড — UI-তে কখনো
-- "ফ্রি প্ল্যানে ১০০ MB" বলে দেখানো যাবে না।
create or replace function public.effective_storage_mb(p_seller_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select p.storage_mb
     from public.subscription_plans p
     where p.id = public.current_plan_id(p_seller_id)),
    100);
$$;

-- এই সেলার আরেকটা পেজ প্রকাশ করতে পারবে কি?
-- লগইন করা সেলার শুধু নিজেরটাই জিজ্ঞেস করতে পারে।
create or replace function public.can_publish_page(p_seller_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if auth.uid() is not null and auth.uid() <> p_seller_id then
    raise exception 'অন্য সেলারের তথ্য দেখা যাবে না।';
  end if;
  v_limit := public.effective_page_limit(p_seller_id);
  select count(*) into v_count
  from public.pages
  where seller_id = p_seller_id and is_published and not is_suspended;
  return v_count < v_limit;
end;
$$;

-- ব্যবহারের হিসাব আবার গোনা (সক্রিয় পেজ + ছবির মোট বাইট)।
create or replace function public.refresh_subscription_usage(p_seller_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pages integer;
  v_bytes bigint;
begin
  if auth.uid() is not null and auth.uid() <> p_seller_id then
    raise exception 'অন্য সেলারের তথ্য দেখা যাবে না।';
  end if;
  select count(*) into v_pages
  from public.pages
  where seller_id = p_seller_id and is_published and not is_suspended;
  select coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0)
    into v_bytes
  from storage.objects
  where bucket_id = 'product-images'
    and name like p_seller_id::text || '/%';
  insert into public.subscription_usage
    (seller_id, active_pages, storage_bytes, updated_at)
  values (p_seller_id, v_pages, v_bytes, now())
  on conflict (seller_id) do update set
    active_pages = excluded.active_pages,
    storage_bytes = excluded.storage_bytes,
    updated_at = now();
end;
$$;

-- ফ্রি সার্ভিসে কোন পেজটা চালু থাকবে — সেলারের বাছা।
-- শুধু ফ্রি সার্ভিসে থাকলেই বাছা যায়; বাছা পেজ ছাড়া বাকি সব
-- প্রকাশিত পেজ সাসপেন্ড হয়।
create or replace function public.choose_kept_page(p_page_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_published boolean;
begin
  select seller_id, is_published into v_seller_id, v_published
  from public.pages where id = p_page_id;
  if v_seller_id is null then
    raise exception 'পেজ পাওয়া যায়নি।';
  end if;
  if not coalesce(v_published, false) then
    raise exception 'শুধু প্রকাশিত পেজই চালু রাখা যায়।';
  end if;
  if auth.uid() is not null and auth.uid() <> v_seller_id then
    raise exception 'অন্য সেলারের পেজ বদলানো যাবে না।';
  end if;
  if public.current_plan_id(v_seller_id) is not null then
    raise exception 'পেইড প্ল্যান চালু থাকলে সব পেজই চালু থাকে — বাছার দরকার নেই।';
  end if;
  update public.pages set is_suspended = true
  where seller_id = v_seller_id and is_published and id <> p_page_id;
  update public.pages set is_suspended = false
  where id = p_page_id;
  insert into public.subscription_history (seller_id, action, note)
  values (v_seller_id, 'kept_page_chosen',
    'ফ্রি সার্ভিসে চালু রাখার পেজ বদলানো হয়েছে।');
  perform public.refresh_subscription_usage(v_seller_id);
end;
$$;

-- পেমেন্ট অনুমোদন — অ্যাডমিনের কাজ (SQL Editor / Phase 6 অ্যাডমিন
-- প্যানেল থেকে)। অনুমোদনের দিন থেকে ৩০ দিনের মেয়াদ শুরু হয়,
-- রসিদ কোড বসে, সাসপেন্ড হওয়া পেজগুলো আবার চালু হয়।
-- ফেরত দেয় রসিদ কোড (যেমন OL-RCP-1001)।
create or replace function public.approve_subscription_payment(p_payment_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.subscription_payments%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_receipt text;
begin
  select * into v_pay
  from public.subscription_payments
  where id = p_payment_id
  for update;
  if not found then
    raise exception 'পেমেন্ট পাওয়া যায়নি।';
  end if;
  if v_pay.status <> 'pending' then
    raise exception 'এই পেমেন্টটি আগেই যাচাই করা হয়েছে।';
  end if;
  select * into v_plan
  from public.subscription_plans
  where id = v_pay.plan_id;
  if not found or not v_plan.is_active then
    raise exception 'প্যাকেজটি আর চালু নেই।';
  end if;
  v_receipt := 'OL-RCP-' || nextval('public.receipt_code_seq');
  update public.subscription_payments
  set status = 'approved', receipt_code = v_receipt,
    reviewed_at = now(), updated_at = now()
  where id = p_payment_id;
  insert into public.seller_subscriptions
    (seller_id, plan_id, starts_at, ends_at, status)
  values (v_pay.seller_id, v_pay.plan_id, now(), now() + interval '30 days', 'active')
  on conflict (seller_id) do update set
    plan_id = excluded.plan_id,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    status = 'active',
    updated_at = now();
  update public.pages set is_suspended = false
  where seller_id = v_pay.seller_id and is_suspended;
  insert into public.subscription_history (seller_id, plan_id, action, note)
  values (v_pay.seller_id, v_pay.plan_id, 'payment_approved',
    'পেমেন্ট অনুমোদন — রসিদ ' || v_receipt || ', মেয়াদ ৩০ দিন।');
  perform public.refresh_subscription_usage(v_pay.seller_id);
  return v_receipt;
end;
$$;

-- পেমেন্ট বাতিল — কারণ লিখতেই হবে, সেলারকে হুবহু দেখানো হয়।
create or replace function public.reject_subscription_payment(
  p_payment_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.subscription_payments%rowtype;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'বাতিলের কারণ লিখতেই হবে।';
  end if;
  select * into v_pay
  from public.subscription_payments
  where id = p_payment_id
  for update;
  if not found then
    raise exception 'পেমেন্ট পাওয়া যায়নি।';
  end if;
  if v_pay.status <> 'pending' then
    raise exception 'এই পেমেন্টটি আগেই যাচাই করা হয়েছে।';
  end if;
  update public.subscription_payments
  set status = 'rejected', reject_reason = btrim(p_reason),
    reviewed_at = now(), updated_at = now()
  where id = p_payment_id;
  insert into public.subscription_history (seller_id, plan_id, action, note)
  values (v_pay.seller_id, v_pay.plan_id, 'payment_rejected',
    'পেমেন্ট বাতিল — কারণ: ' || btrim(p_reason));
end;
$$;

-- মেয়াদ শেষের প্রসেসর — প্রতিদিন চলে (pg_cron → Edge Function
-- process-subscription-expiry → এই ফাংশন)।
-- ১) মেয়াদ শেষ কিন্তু গ্রেসের মধ্যে → status 'grace'।
-- ২) গ্রেসও শেষ → ফ্রি সার্ভিস: সবচেয়ে আগে প্রকাশ করা পেজটা
--    চালু থাকে, বাকি প্রকাশিত পেজ সাসপেন্ড হয়, status 'expired'।
-- ফেরত দেয় { grace_started, expired, pages_suspended }।
create or replace function public.process_subscription_expiry()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grace integer := public.subscription_grace_days();
  v_grace_started integer := 0;
  v_expired integer := 0;
  v_suspended integer := 0;
  r record;
  v_keep uuid;
  v_n integer;
begin
  with moved as (
    update public.seller_subscriptions
    set status = 'grace', updated_at = now()
    where status = 'active'
      and ends_at <= now()
      and ends_at > now() - (v_grace || ' days')::interval
    returning seller_id, plan_id
  )
  insert into public.subscription_history (seller_id, plan_id, action, note)
  select seller_id, plan_id, 'grace_started',
    'মেয়াদ শেষ হয়েছে — ' || v_grace || ' দিনের গ্রেস চলছে।'
  from moved;
  get diagnostics v_grace_started = row_count;

  for r in
    select seller_id from public.seller_subscriptions
    where status in ('active', 'grace')
      and ends_at <= now() - (v_grace || ' days')::interval
  loop
    select id into v_keep
    from public.pages
    where seller_id = r.seller_id and is_published and not is_suspended
    order by created_at asc
    limit 1;
    update public.pages set is_suspended = true
    where seller_id = r.seller_id and is_published and not is_suspended
      and (v_keep is null or id <> v_keep);
    get diagnostics v_n = row_count;
    v_suspended := v_suspended + v_n;
    update public.seller_subscriptions
    set status = 'expired', updated_at = now()
    where seller_id = r.seller_id;
    insert into public.subscription_history (seller_id, action, note)
    values (r.seller_id, 'expired_free_service',
      'মেয়াদ ও গ্রেস শেষ — ফ্রি সার্ভিসে ' || v_n || 'টি পেজ সাসপেন্ড হয়েছে।');
    perform public.refresh_subscription_usage(r.seller_id);
    v_expired := v_expired + 1;
  end loop;

  return jsonb_build_object(
    'grace_started', v_grace_started,
    'expired', v_expired,
    'pages_suspended', v_suspended
  );
end;
$$;

-- ============ প্রকাশের সীমা — ডাটাবেসেই আটকানো ============
-- অ্যাপ থেকে (authenticated রোলে) পেজ প্রকাশ করলে সীমা ধরা হবে —
-- SQL Editor / সিড / সার্ভিস-রোল থেকে নয়। JS-এর can_publish_page
-- চেক শুধু আগে থেকে বন্ধুত্বপূর্ণ ভুল দেখায়; আসল বাধা এটাই।
create or replace function public.enforce_publish_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if new.is_published
    and (tg_op = 'INSERT' or old.is_published is distinct from true)
  then
    v_limit := public.effective_page_limit(new.seller_id);
    select count(*) into v_count
    from public.pages
    where seller_id = new.seller_id
      and is_published and not is_suspended
      and id <> new.id;
    if v_count >= v_limit then
      raise exception 'প্যাকেজের সীমা শেষ — এই প্ল্যানে সর্বোচ্চ %টি পেজ প্রকাশ করা যায়। নতুন পেজ প্রকাশ করতে প্যাকেজ আপগ্রেড করুন বা একটি পেজ খসড়া করুন।', v_limit;
    end if;
  end if;
  return new;
end;
$$;

create trigger pages_enforce_publish_limit
  before insert or update on public.pages
  for each row execute function public.enforce_publish_limit();

-- ============ ফাংশনের অনুমতি ============
-- অনুমোদন/বাতিল/মেয়াদ-প্রসেসর শুধু সার্ভার (service_role) থেকে —
-- কোনো লগইন করা সেলার নিজে ডাকতে পারবে না।
revoke execute on function public.approve_subscription_payment(uuid) from public;
grant execute on function public.approve_subscription_payment(uuid) to service_role;
revoke execute on function public.reject_subscription_payment(uuid, text) from public;
grant execute on function public.reject_subscription_payment(uuid, text) to service_role;
revoke execute on function public.process_subscription_expiry() from public;
grant execute on function public.process_subscription_expiry() to service_role;
-- সেলারের নিজের কাজের ফাংশন — লগইন করা সেলার + সার্ভার।
revoke execute on function public.can_publish_page(uuid) from public;
grant execute on function public.can_publish_page(uuid) to authenticated, service_role;
revoke execute on function public.refresh_subscription_usage(uuid) from public;
grant execute on function public.refresh_subscription_usage(uuid) to authenticated, service_role;
revoke execute on function public.choose_kept_page(uuid) from public;
grant execute on function public.choose_kept_page(uuid) to authenticated, service_role;
