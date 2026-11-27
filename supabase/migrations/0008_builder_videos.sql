-- Orderlink standalone — migration 0008
-- বিল্ডারের একাধিক ভিডিও + নতুন সেকশনের ডিফল্ট:
-- - pages.video_urls — ভিডিওর তালিকা [{url, label?}] (JSONB)।
--   পুরনো video_url কলাম ফলব্যাক হিসেবে থাকে — নতুন কোড video_urls
--   আগে পড়ে, না থাকলে video_url ব্যবহার করে। পুরনো সারিতে খালি
--   তালিকা থাকে; সেভ করলে বিল্ডার প্রথম ভিডিওটা video_url-তেও লেখে।
-- - নতুন সেকশন (বিবরণ + ডেলিভারি তথ্য) নতুন পেজের ডিফল্টে যোগ —
--   আগের পেজের সেভ করা sections/section_order বদলায় না।

alter table public.pages
  add column if not exists video_urls jsonb not null default '[]'::jsonb;

alter table public.pages
  alter column sections set default
    '{"gallery": true, "description": true, "benefits": true, "specs": true, "video": true, "reviews": true, "faq": true, "delivery": true}'::jsonb;

alter table public.pages
  alter column section_order set default
    '["gallery", "description", "benefits", "specs", "video", "reviews", "faq", "delivery"]'::jsonb;
