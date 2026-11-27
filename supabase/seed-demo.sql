-- Orderlink standalone — ডেমো ডেটা সিড (seed-demo.sql)
-- লাইভ অ্যাপের ডেমো শপের মতো: ডেমো শপ (demo-shop), ২টি প্রকাশিত প্রোডাক্ট,
-- ৪টি ডেমো অর্ডার (মোট ৳৫,৩৫০)।
-- চালানোর জায়গা: Supabase Dashboard → SQL Editor (postgres রোলে চলে বলে
-- auth.users-এ লেখা যায়)। একবার চালালেই হবে; আবার চালালে ডুপ্লিকেট হবে না।
-- নিয়ম:
-- - অর্ডার কোড হাতে লেখা হয়নি — 0003-এর trigger পরের কোডগুলো বসাবে
--   (OL-1001 TEST Shop-এর, তাই ডেমো অর্ডার পাবে OL-1002…OL-1005)।
-- - TEST শপ/প্রোডাক্ট/অর্ডার ছোঁয়া হয় না; সাবস্ক্রিপশন টেবিল নেই বলে
--   ডেমো শপের কোনো প্ল্যান সিড করা হয়নি (ড্যাশবোর্ডে "ফ্রি প্ল্যান" দেখাবে)।
-- - ডেমো শপের Google Sheet যুক্ত নয় (লাইভ ডেমো শপের মতোই) — তাই
--   অর্ডারের sheet_status 'not_connected'।

create extension if not exists pgcrypto;

do $$
declare
  v_demo_id uuid;
  v_shop_id uuid;
  v_earbuds_id uuid;
  v_wallet_id uuid;
begin
  -- ---------- ১. Auth ব্যবহারকারী (demo@orderlink.demo / demo1234) ----------
  select id into v_demo_id from auth.users where email = 'demo@orderlink.demo';
  if v_demo_id is null then
    v_demo_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      -- টোকেন ঘরগুলো '' হতে হবে, NULL নয় — GoTrue লগইনে NULL পড়তে পারে না
      -- ("converting NULL to string is unsupported") বলে 500 দেয়।
      confirmation_token, recovery_token, email_change_token_new,
      email_change_token_current, phone_change_token, email_change, phone_change,
      created_at, updated_at
    ) values (
      v_demo_id, '00000000-0000-0000-0000-000000000000', 'demo@orderlink.demo',
      crypt('demo1234', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      'authenticated', 'authenticated',
      '', '', '', '', '', '', '',
      now(), now()
    );
  end if;

  -- identity না থাকলে বসান (পাসওয়ার্ড লগইনের জন্য লাগে)।
  if not exists (
    select 1 from auth.identities
    where user_id = v_demo_id and provider = 'email'
  ) then
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_demo_id,
      jsonb_build_object('sub', v_demo_id::text, 'email', 'demo@orderlink.demo'),
      'email', v_demo_id::text, now(), now(), now()
    );
  end if;

  -- ---------- ২. সেলার + দোকান ----------
  insert into public.sellers (id, email, owner_name, shop_name, whatsapp)
  values (v_demo_id, 'demo@orderlink.demo', 'ডেমো', 'ডেমো শপ', '8801712345678')
  on conflict (id) do nothing;

  insert into public.shops (seller_id, slug, name, delivery_inside_charge, delivery_outside_charge)
  values (v_demo_id, 'demo-shop', 'ডেমো শপ', 60, 120)
  on conflict (slug) do nothing;

  select id into v_shop_id from public.shops where slug = 'demo-shop';

  -- ---------- ৩. প্রোডাক্ট + পেজ (প্রকাশিত) ----------
  select id into v_earbuds_id
  from public.products
  where shop_id = v_shop_id and name = 'ওয়্যারলেস ব্লুটুথ ইয়ারবাড';
  if v_earbuds_id is null then
    insert into public.products (seller_id, shop_id, name, price, old_price, description)
    values (v_demo_id, v_shop_id, 'ওয়্যারলেস ব্লুটুথ ইয়ারবাড', 1250, 1800,
      'প্রিমিয়াম সাউন্ডের ওয়্যারলেস ব্লুটুথ ইয়ারবাড — দীর্ঘ ব্যাটারি ব্যাকআপ, আরামদায়ক ফিট।')
    returning id into v_earbuds_id;
  end if;

  select id into v_wallet_id
  from public.products
  where shop_id = v_shop_id and name = 'প্রিমিয়াম লেদার ওয়ালেট';
  if v_wallet_id is null then
    insert into public.products (seller_id, shop_id, name, price, old_price, description)
    values (v_demo_id, v_shop_id, 'প্রিমিয়াম লেদার ওয়ালেট', 850, 1200,
      'আসল চামড়ার প্রিমিয়াম ওয়ালেট — স্লিম ডিজাইন, অনেকগুলো কার্ড স্লট।')
    returning id into v_wallet_id;
  end if;

  insert into public.pages (product_id, seller_id, shop_id, slug, template, page_lang, is_published)
  values (v_earbuds_id, v_demo_id, v_shop_id, 'demo-wireless-earbuds', 'premium-ecommerce', 'bn', true)
  on conflict (product_id) do nothing;

  insert into public.pages (product_id, seller_id, shop_id, slug, template, page_lang, is_published)
  values (v_wallet_id, v_demo_id, v_shop_id, 'demo-leather-wallet', 'modern-premium', 'bn', true)
  on conflict (product_id) do nothing;

  -- ---------- ৪. ডেমো অর্ডার (৪টি, মোট ৳৫,৩৫০) ----------
  -- নতুন ২টি, কনফার্মড ১টি, ডেলিভারড ১টি — লাইভ ডেমো শপের মতো।
  -- order_code trigger বসাবে (OL-1002…OL-1005)।
  if not exists (select 1 from public.orders where seller_id = v_demo_id) then
    insert into public.orders (
      seller_id, shop_id, product_id, customer_name, customer_phone,
      division, district, upazila, address_line, delivery_area,
      delivery_charge, quantity, total, status, sheet_status, created_at
    ) values
      (v_demo_id, v_shop_id, v_earbuds_id, 'ডেমো কাস্টমার ১', '01711111111',
       'ঢাকা', 'ঢাকা', 'মিরপুর', 'বাসা ১২, রোড ৫, মিরপুর-১', 'outside',
       120, 1, 1370, 'new', 'not_connected', now() - interval '3 hours'),
      (v_demo_id, v_shop_id, v_earbuds_id, 'ডেমো কাস্টমার ২', '01822222222',
       'ঢাকা', 'ঢাকা', 'ধানমন্ডি', 'বাসা ৮, রোড ২৭, ধানমন্ডি', 'inside',
       60, 1, 1310, 'new', 'not_connected', now() - interval '2 hours'),
      (v_demo_id, v_shop_id, v_wallet_id, 'ডেমো কাস্টমার ৩', '01933333333',
       'চট্টগ্রাম', 'চট্টগ্রাম', 'আগ্রাবাদ', 'বাসা ৩, আগ্রাবাদ', 'inside',
       60, 2, 1760, 'confirmed', 'not_connected', now() - interval '1 hour'),
      (v_demo_id, v_shop_id, v_wallet_id, 'ডেমো কাস্টমার ৪', '01544444444',
       'ঢাকা', 'ঢাকা', 'উত্তরা', 'বাসা ২১, সেক্টর ৪, উত্তরা', 'inside',
       60, 1, 910, 'delivered', 'not_connected', now());
  end if;
end $$;

-- ---------- যাচাই (সিডের পরে SQL Editor-এ আলাদা করে চালান) ----------
-- select email from auth.users where email = 'demo@orderlink.demo';
-- select slug, name from public.shops where slug = 'demo-shop';
-- select name, price, old_price from public.products
--   where shop_id = (select id from public.shops where slug = 'demo-shop');
-- select slug, template, is_published from public.pages
--   where shop_id = (select id from public.shops where slug = 'demo-shop');
-- select order_code, customer_name, total, status from public.orders
--   where seller_id = (select id from auth.users where email = 'demo@orderlink.demo')
--   order by created_at;
-- select count(*), sum(total) from public.orders
--   where seller_id = (select id from auth.users where email = 'demo@orderlink.demo');
-- প্রত্যাশা: ১টি auth user, ১টি দোকান, ২টি প্রোডাক্ট, ২টি প্রকাশিত পেজ,
-- ৪টি অর্ডার (OL-1002…OL-1005), মোট ৳৫,৩৫০।
