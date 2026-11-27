-- Orderlink standalone — Phase 1 migration 0001
-- sellers, shops, products, orders, password_resets + RLS (owner-only)।
-- পরিকল্পনার §৪ (ডাটা মডেল) অনুযায়ী; Keep It Simple — Phase 1-এর বাইরের
-- কোনো টেবিল (সাবস্ক্রিপশন, অ্যাডমিন, নোটিফিকেশন) এখানে নেই।
-- password_resets আছে কারণ Phase 1-এর ৬-সংখ্যার রিসেট কোডের জন্য
-- সার্ভারে হ্যাশ রাখতেই হয় (পরিকল্পনার §৪-এ এই টেবিল আছেই)।

-- updated_at স্বয়ংক্রিয়ভাবে বসানোর trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ sellers ============
-- সেলারের অ্যাকাউন্ট। id = Supabase Auth user id — এটাই মালিকানার চাবি।
create table public.sellers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  owner_name text,
  shop_name text,
  whatsapp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ shops ============
-- দোকানের পাবলিক পরিচয়। slug লিংকের অংশ: /<shop>/<product>।
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  slug text not null unique,
  name text not null,
  logo_url text,
  delivery_inside_charge numeric(10, 2) not null default 60,
  delivery_outside_charge numeric(10, 2) not null default 120,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shops_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint shops_delivery_charges_nonnegative
    check (delivery_inside_charge >= 0 and delivery_outside_charge >= 0)
);
create index shops_seller_id_idx on public.shops (seller_id);

-- ============ products ============
-- দাম ও পুরনো দাম থেকে ছাড়ের শতাংশ অটো-হিসাব হবে (কোডে, Phase 2)।
create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  old_price numeric(10, 2) check (old_price is null or old_price >= 0),
  description text,
  benefits text[] not null default '{}',
  specs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_seller_id_idx on public.products (seller_id);
create index products_shop_id_idx on public.products (shop_id);

-- ============ orders ============
-- অর্ডারই সত্যের উৎস (source of truth)। কাস্টমার লগইন ছাড়া অর্ডার দেয়।
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  shop_id uuid references public.shops (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  order_code text not null unique,
  customer_name text not null,
  customer_phone text not null,
  division text,
  district text,
  upazila text,
  address_line text,
  delivery_area text not null default 'inside'
    check (delivery_area in ('inside', 'outside')),
  delivery_charge numeric(10, 2) not null default 0 check (delivery_charge >= 0),
  quantity integer not null default 1 check (quantity > 0),
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  sheet_status text not null default 'pending'
    check (sheet_status in ('pending', 'synced', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_seller_id_idx on public.orders (seller_id);
create index orders_created_at_idx on public.orders (created_at desc);

-- ============ password_resets ============
-- ৬-সংখ্যার রিসেট কোড — শুধু SHA-256 হ্যাশ আকারে থাকে, কোড কখনো
-- plain text-এ ডাটাবেসে বসে না। ২০ মিনিট মেয়াদ, একবার ব্যবহারযোগ্য,
-- ৫ বার ভুলে ১৫ মিনিট লক, ৬০ সেকেন্ড resend কুলডাউন।
create table public.password_resets (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  locked_until timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index password_resets_email_idx on public.password_resets (email, created_at desc);

-- ============ updated_at triggers ============
create trigger sellers_set_updated_at
  before update on public.sellers
  for each row execute function public.set_updated_at();
create trigger shops_set_updated_at
  before update on public.shops
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ============ Row Level Security ============
alter table public.sellers enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.password_resets enable row level security;

-- sellers: শুধু নিজের সারি (id = auth.uid())।
create policy sellers_owner_select on public.sellers
  for select using (auth.uid() = id);
create policy sellers_owner_insert on public.sellers
  for insert with check (auth.uid() = id);
create policy sellers_owner_update on public.sellers
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- shops: পাবলিক পড়া যাবে (কাস্টমার পেজ লগইন ছাড়া খোলে);
-- লেখা শুধু মালিকের।
create policy shops_public_select on public.shops
  for select using (true);
create policy shops_owner_insert on public.shops
  for insert with check (seller_id = auth.uid());
create policy shops_owner_update on public.shops
  for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy shops_owner_delete on public.shops
  for delete using (seller_id = auth.uid());

-- products: পাবলিক পড়া যাবে; লেখা শুধু মালিকের।
create policy products_public_select on public.products
  for select using (true);
create policy products_owner_insert on public.products
  for insert with check (seller_id = auth.uid());
create policy products_owner_update on public.products
  for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy products_owner_delete on public.products
  for delete using (seller_id = auth.uid());

-- orders: পড়া/বদল শুধু মালিকের; জমা (insert) দিতে পারবে যে কেউ
-- (কাস্টমার লগইন ছাড়া অর্ডার দেয়) — তবে শুধু আসল দোকানের অর্ডার।
create policy orders_owner_select on public.orders
  for select using (seller_id = auth.uid());
create policy orders_owner_update on public.orders
  for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy orders_owner_delete on public.orders
  for delete using (seller_id = auth.uid());
create policy orders_public_insert on public.orders
  for insert with check (
    exists (select 1 from public.shops where shops.id = shop_id)
  );

-- password_resets: কোনো public/authenticated পলিসি নেই — শুধু
-- service-role key (Edge Functions) এই টেবিল ছুঁতে পারবে। RLS
-- চালু থাকায় anon/authenticated কোয়েরি সবসময় খালি ফিরবে।
