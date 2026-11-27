-- Orderlink standalone — Phase 2 migration 0002
-- product_images + pages + Storage বাকেট "product-images" + RLS।
-- 0001-এর sellers/shops/products/orders/password_resets এখানে নতুন করে
-- বানানো হয়নি — শুধু Phase 2-এর নতুন টেবিল।
-- pages = প্রকাশিত ল্যান্ডিং পেজের রেকর্ড (এক প্রোডাক্ট = এক পেজ)।
-- প্রোডাক্টের slug pages-এ থাকে, shop_id-প্রতি unique।

-- ============ product_images ============
-- গ্যালারির ছবি (সর্বোচ্চ ৮টি)। আসল ফাইল Supabase Storage-এ
-- (বাকেট product-images, পথ <seller_id>/<ফাইল>)।
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  storage_path text not null,
  url text not null,
  is_main boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_id_idx on public.product_images (product_id);

-- এক প্রোডাক্টে ৮টির বেশি ছবি ঢুকতে দেবে না (অ্যাপেও যাচাই আছে)।
create or replace function public.check_product_image_limit()
returns trigger
language plpgsql
as $$
declare
  img_count integer;
begin
  select count(*) into img_count
  from public.product_images
  where product_id = new.product_id;
  if img_count >= 8 then
    raise exception 'একটি প্রোডাক্টে সর্বোচ্চ ৮টি ছবি রাখা যাবে।';
  end if;
  return new;
end;
$$;
create trigger product_images_limit_trigger
  before insert on public.product_images
  for each row execute function public.check_product_image_limit();

-- ============ pages ============
-- ল্যান্ডিং পেজ: কোন টেমপ্লেট, কোন সেকশন চালু/ক্রম, ভিডিও, রিভিউ,
-- FAQ, পেজের ভাষা, প্রকাশিত কি না।
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  slug text not null,
  template text not null default 'minimal-white'
    check (template in (
      'minimal-white', 'offer-special', 'modern-premium',
      'premium-ecommerce', 'premium-dark', 'aura-premium',
      'nova-editorial', 'social-proof'
    )),
  sections jsonb not null default
    '{"gallery": true, "benefits": true, "specs": true, "video": true, "reviews": true, "faq": true}'::jsonb,
  section_order jsonb not null default
    '["gallery", "benefits", "specs", "video", "reviews", "faq"]'::jsonb,
  video_url text,
  reviews jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  page_lang text not null default 'bn' check (page_lang in ('bn', 'en')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pages_slug_unique_per_shop unique (shop_id, slug),
  constraint pages_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create index pages_seller_id_idx on public.pages (seller_id);
create index pages_shop_slug_idx on public.pages (shop_id, slug);

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- ============ Storage বাকেট: product-images ============
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ============ Row Level Security ============
alter table public.product_images enable row level security;
alter table public.pages enable row level security;

-- product_images: পাবলিক পড়া যাবে; লেখা শুধু মালিকের।
create policy product_images_public_select on public.product_images
  for select using (true);
create policy product_images_owner_insert on public.product_images
  for insert with check (seller_id = auth.uid());
create policy product_images_owner_update on public.product_images
  for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy product_images_owner_delete on public.product_images
  for delete using (seller_id = auth.uid());

-- pages: পাবলিক পড়া যাবে (কাস্টমার পেজ লগইন ছাড়া খোলে);
-- লেখা শুধু মালিকের।
create policy pages_public_select on public.pages
  for select using (true);
create policy pages_owner_insert on public.pages
  for insert with check (seller_id = auth.uid());
create policy pages_owner_update on public.pages
  for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy pages_owner_delete on public.pages
  for delete using (seller_id = auth.uid());

-- Storage: ছবি সবাই পড়তে পারবে; আপলোড/বদল/মোছা শুধু মালিকের —
-- ফাইলের পথের প্রথম অংশই মালিকের user id (<seller_id>/...)।
create policy product_images_storage_public_read on storage.objects
  for select using (bucket_id = 'product-images');
create policy product_images_storage_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy product_images_storage_owner_update on storage.objects
  for update using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy product_images_storage_owner_delete on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
