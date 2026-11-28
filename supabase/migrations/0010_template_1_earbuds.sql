-- Orderlink standalone — migration 0010
-- pages.template CHECK-এ 'template-1-earbuds' যোগ করা।
-- 0002-এর ইনলাইন CHECK (Postgres-এর স্বয়ংক্রিয় নাম:
-- pages_template_check) শুধু আসল ৮টি id অনুমোদন করে —
-- নতুন টেমপ্লেটের পণ্য সেভ করতে গেলে CHECK ভায়োলেশন
-- হতো। একই নামে বাদ দিয়ে আবার যোগ করা হয় — আগের ৮টি
-- id ঠিক রেখে, নতুন id-সহ।
-- সাবধান: ADD CONSTRAINT চালু সব সারি যাচাই করে। লাইভে
-- চালানোর আগে `select distinct template from pages;`
-- দিয়ে দেখে নিতে হবে — কোনো সারিতে তালিকার বাইরের id
-- থাকলে (যেমন সরিয়ে দেওয়া পুরনো টেমপ্লেট), ADD ব্যর্থ
-- হবে; তখন সেই id-গুলোও তালিকায় যোগ করতে হবে, বা সারিগুলো
-- আগে আপডেট করতে হবে।

alter table public.pages drop constraint if exists pages_template_check;
alter table public.pages add constraint pages_template_check
  check (template in (
    'minimal-white', 'offer-special', 'modern-premium',
    'premium-ecommerce', 'premium-dark', 'aura-premium',
    'nova-editorial', 'social-proof', 'template-1-earbuds'
  ));
