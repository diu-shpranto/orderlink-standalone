// টেমপ্লেট ১-এর নমুনা ডাটা — ডেমো শপের আসল ইয়ারবাডস পণ্য
// (নাম, দাম, সুবিধা, স্পেসিফিকেশন, ডেলিভারি চার্জ) + আসল
// পণ্যের ছবি। এটা শুধু ডেমো/প্রিভিউ ডাটা — আসল দোকানে
// সেলারের নিজের ডাটা থেকেই পেজ বানানো হবে।
// রেটিং ৪.৫ / ২টি রিভিউ — ডেমো শপের ২টি ডেমো রিভিউ
// (৫★ + ৪★) থেকে নেওয়া; আসল দোকানে আসল রিভিউ থেকেই
// হিসাব হবে, রিভিউ না থাকলে তারার লাইন দেখাবে না।
import type {
  TemplateOneProduct,
  TemplateOneSeller,
} from '../components/template1/types.ts'

export const sampleSeller: TemplateOneSeller = {
  name: 'ডেমো শপ',
  logoUrl: null,
  phone: '01712345678',
}

export const sampleProduct: TemplateOneProduct = {
  name: 'ওয়্যারলেস ব্লুটুথ ইয়ারবাড',
  category: 'ইয়ারবাডস',
  images: [
    {
      url: 'https://xrkdoijcdokuvsahmepw.supabase.co/storage/v1/object/public/product-images/acc70714-f004-4b0b-9597-aff76d2e7378/89f30e67-dced-4149-bb1b-81c87a7e9403-earbuds-1.jpg',
      alt: 'ওয়্যারলেস ব্লুটুথ ইয়ারবাড — ছবি ১',
    },
    {
      url: 'https://xrkdoijcdokuvsahmepw.supabase.co/storage/v1/object/public/product-images/acc70714-f004-4b0b-9597-aff76d2e7378/68b5c5fd-1381-4f78-8e4e-722f682b2602-earbuds-2.jpg',
      alt: 'ওয়্যারলেস ব্লুটুথ ইয়ারবাড — ছবি ২',
    },
    {
      url: 'https://xrkdoijcdokuvsahmepw.supabase.co/storage/v1/object/public/product-images/acc70714-f004-4b0b-9597-aff76d2e7378/06cdf2fd-2ada-4a9c-bcf4-a8042d712a25-earbuds-3.jpg',
      alt: 'ওয়্যারলেস ব্লুটুথ ইয়ারবাড — ছবি ৩',
    },
  ],
  price: 1250,
  oldPrice: 1800,
  stock: 14,
  rating: 4.5,
  reviewCount: 2,
  highlights: [
    'প্রিমিয়াম সাউন্ড কোয়ালিটি',
    'দীর্ঘ ব্যাটারি ব্যাকআপ',
    'আরামদায়ক ও হালকা ফিট',
  ],
  specs: [
    { label: 'চার্জিং', value: 'টাইপ-সি ফাস্ট চার্জিং' },
    { label: 'ওয়ারেন্টি', value: '৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি' },
    { label: 'ব্লুটুথ ভার্সন', value: '৫.৩' },
    { label: 'ব্যাটারি ব্যাকআপ', value: '২০ ঘণ্টা পর্যন্ত (কেসসহ)' },
  ],
  deliveryCharges: { inside: 60, outside: 120 },
}
