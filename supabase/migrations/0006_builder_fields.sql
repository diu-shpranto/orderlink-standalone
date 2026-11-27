-- Orderlink standalone — migration 0006
-- বিল্ডারের নতুন ফিল্ড (লাইভ অ্যাপের মতো):
-- - products.short_description — ছোট বিবরণ, নামের নিচে এক লাইনে দেখানো হয়
-- - products.category — ক্যাটাগরি, পেজে ছোট লেবেল হিসেবে দেখায় (ঐচ্ছিক)
-- - pages.delivery_info — ডেলিভারি তথ্য, ডেলিভারি/অর্ডার সেকশনে দেখানো হয়
-- তিনটিই ঐচ্ছিক (nullable); না থাকলে আগের মতোই দেখাবে।

alter table public.products
  add column if not exists short_description text;

alter table public.products
  add column if not exists category text;

alter table public.pages
  add column if not exists delivery_info text;
