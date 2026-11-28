-- Orderlink standalone — migration 0011
-- pages.template CHECK-এ 'template-2-fashion' যোগ করা।
-- 0010-এর মতোই: একই নামে বাদ দিয়ে আবার যোগ করা হয় —
-- আগের ৯টি id ঠিক রেখে, নতুন id-সহ।
-- সাবধান: ADD CONSTRAINT চালু সব সারি যাচাই করে। লাইভে
-- চালানোর আগে `select distinct template from pages;`
-- দিয়ে দেখে নিতে হবে — কোনো সারিতে তালিকার বাইরের id
-- থাকলে ADD ব্যর্থ হবে; তখন সেই id-গুলোও তালিকায় যোগ
-- করতে হবে, বা সারিগুলো আগে আপডেট করতে হবে।

alter table public.pages drop constraint if exists pages_template_check;
alter table public.pages add constraint pages_template_check
  check (template in (
    'minimal-white', 'offer-special', 'modern-premium',
    'premium-ecommerce', 'premium-dark', 'aura-premium',
    'nova-editorial', 'social-proof', 'template-1-earbuds',
    'template-2-fashion'
  ));
