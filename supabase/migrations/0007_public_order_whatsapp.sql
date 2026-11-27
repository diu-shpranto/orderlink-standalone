-- Orderlink standalone — migration 0007
-- দুটো পুরনো বাগের ডাটাবেস ঠিক করা (লগইন ছাড়া অর্ডার + পাবলিক WhatsApp):
-- 1) orders.client_key — কাস্টমারের জমা দেওয়া অর্ডারের কোড ফেরত
--    পাওয়ার চাবি। insert-এর read-back RLS-এ আটকায়
--    (orders_owner_select: seller_id = auth.uid(), লগইন ছাড়া uid
--    নেই), তাই .insert().select().single() 401 দেয় — অর্ডার তৈরি
--    হয়েই যায়, কিন্তু কাস্টমার "অর্ডার দেওয়া যায়নি" দেখে।
-- 2) get_order_code_by_client_key — শুধু ওই কী-র অর্ডারের id +
--    order_code ফেরত দেয় (১০ মিনিটের ভেতরেরটা); আর কিছু নয়।
-- 3) get_seller_whatsapp — দোকানের স্লাগ দিলে শুধু সেলারের WhatsApp
--    নম্বর ফেরত দেয়; সেলারের আর কোনো তথ্য নয় (sellers টেবিল
--    সরাসরি পড়া লগইন ছাড়া RLS-এ আটকায়)।
-- RLS পলিসিতে কোনো বদল নেই — orders/sellers পড়া-লেখার নিয়ম
-- আগের মতোই। নতুন ফাংশন দুটো SECURITY DEFINER + search_path পিন
-- করা; GRANT শুধু anon/authenticated-কে (0003-এর check_recent_order
-- -এর মতোই — ওই ফাংশনও এভাবেই চলে)।
-- নিরাপত্তা: client_key প্রতি জমায় নতুন random UUID (১২২ বিট) —
-- আন্দাজ করা যায় না; ফাংশন শুধু ওই কী-র অর্ডারের কোড দেয়, কোনো
-- নাম/ফোন/ঠিকানা নয়; ১০ মিনিটের সীমা থাকায় পুরনো কী দিয়ে কিছু
-- পাওয়া যায় না। WhatsApp নম্বর সেলারের পাবলিক যোগাযোগের নম্বরই —
-- পেজে দেখানোর জন্যই সেলার এটা দেয়।

-- ============ অর্ডার: client_key কলাম ============
alter table public.orders
  add column if not exists client_key text;

create index if not exists orders_client_key_idx
  on public.orders (client_key);

-- ============ অর্ডার কোড আনার ফাংশন ============
create or replace function public.get_order_code_by_client_key(p_client_key text)
returns table(id uuid, order_code text)
language sql
security definer
set search_path = public
as $$
  select o.id, o.order_code
  from public.orders o
  where o.client_key = p_client_key
    and o.created_at >= now() - interval '10 minutes'
  order by o.created_at desc
  limit 1;
$$;

grant execute on function public.get_order_code_by_client_key(text) to anon, authenticated;

-- ============ সেলারের WhatsApp নম্বর আনার ফাংশন ============
create or replace function public.get_seller_whatsapp(p_shop_slug text)
returns text
language sql
security definer
set search_path = public
as $$
  select s.whatsapp
  from public.shops sh
  join public.sellers s on s.id = sh.seller_id
  where sh.slug = p_shop_slug
  limit 1;
$$;

grant execute on function public.get_seller_whatsapp(text) to anon, authenticated;
