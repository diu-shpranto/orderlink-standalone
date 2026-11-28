// "টেমপ্লেট ২ — ফ্যাশন ও লাইফস্টাইল"-এর অ্যাডাপ্টার — আসল ডাটা
// (CustomerPageData: দোকান + পণ্য + পেজ + ছবি) থেকে
// টেমপ্লেটের product/seller অবজেক্ট বানায়। আসল রিভিউ
// থেকেই রেটিং/সংখ্যা হিসাব হয়; রিভিউ না থাকলে তারার
// লাইন লুকানো থাকে। স্টকের ফিল্ড ডাটাবেসে নেই, তাই
// stock দেওয়া হয় না — স্টকের লাইন দেখায় না।
//
// ⚠️ ডাটা-গ্যাপ (Stage 1): নিচের ফিল্ডগুলোর কোনো উৎস মডেলে
// নেই, তাই অ্যাডাপ্টার খালি পাঠায় — সেকশন লুকিয়ে থাকে:
//  • sizes / colors — products-এ সাইজ/রং/ভ্যারিয়েন্টের ফিল্ড নেই
//  • sizeGuide / sizeGuideNote — পেজে সাইজ-গাইড টেবিলের ফিল্ড নেই
//  • story / lifestyle / features — পেজে গল্প/লাইফস্টাইল/
//    ফিচারের আলাদা ফিল্ড নেই
//  • highlights — শুধু benefits (সংক্ষিপ্ত বাক্য) আছে; সেগুলোই
//    শিরোনাম হিসেবে আসে, বিবরণ/আইকন ছাড়া (আইকন ঘুরিয়ে দেওয়া)
//  • deliveryInfo — pages.delivery_info একটাই ফ্রি-টেক্সট
//    স্ট্রিং; ৬টি আলাদা কার্ডের (সময়/পেমেন্ট/পরিবর্তন/ফেরত/
//    সাপোর্ট) উৎস নেই
//  • promoMessage — পেজে প্রোমো বার্তার ফিল্ড নেই (ছাড় থাকলে
//    অফার সেকশন শুধু ছাড় দিয়েই দেখায়)
//  • collectionLabel / headline — পণ্যের ফিল্ড নেই
//  • seller address / facebook / instagram — shops-এ ফিল্ড নেই
// অর্ডারেও সাইজ/রংয়ের কলাম নেই — ফর্মের সাইজ/রং জমা দেওয়ার
// জায়গা নেই (Stage 2-এর মাইগ্রেশন + বিল্ডার সিদ্ধান্ত)।
import type { CustomerPageData } from '../../lib/types.ts'
import type {
  TemplateTwoHighlight,
  TemplateTwoProduct,
  TemplateTwoSeller,
} from './types.ts'

const HIGHLIGHT_ICONS: TemplateTwoHighlight['icon'][] = [
  'fabric',
  'fit',
  'design',
  'finish',
]

export function templateTwoSeller(data: CustomerPageData): TemplateTwoSeller {
  return {
    name: data.shop.name,
    logoUrl: data.shop.logo_url,
    phone: data.sellerWhatsapp,
    whatsapp: data.sellerWhatsapp,
  }
}

export function templateTwoProduct(
  data: CustomerPageData,
): TemplateTwoProduct {
  const { product, images, page, shop } = data
  const rated = page.reviews.filter(
    (r) => typeof r.rating === 'number' && r.rating > 0,
  )
  const rating =
    rated.length > 0
      ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length
      : undefined
  const reviews = (page.reviews ?? []).map((r) => ({
    name: r.name,
    text: r.text,
    rating: r.rating,
    photoUrl: r.photo_url,
    // verified শুধু ডাটায় স্পষ্ট true থাকলেই আসে — না
    // থাকলে undefined, ব্যাজ দেখায় না।
    verified: r.verified === true ? true : undefined,
  }))
  return {
    name: product.name,
    category: product.category,
    images: images.slice(0, 6).map((img) => ({
      url: img.url,
      alt: product.name,
    })),
    price: Number(product.price),
    oldPrice: product.old_price,
    rating,
    reviewCount: rated.length > 0 ? rated.length : undefined,
    // benefits-ই হাইলাইটের একমাত্র উৎস — শিরোনাম হিসেবে আসে;
    // বিবরণ/আইকনের ফিল্ড মডেলে নেই।
    highlights: (product.benefits ?? []).slice(0, 4).map((b, i) => ({
      title: b,
      text: '',
      icon: HIGHLIGHT_ICONS[i % HIGHLIGHT_ICONS.length] ?? 'design',
    })),
    story: [],
    specs: Object.entries(product.specs ?? {}).map(([label, value]) => ({
      label,
      value,
    })),
    sizeGuide: [],
    features: [],
    lifestyle: [],
    reviews,
    faqs: (page.faqs ?? []).map((f) => ({ q: f.q, a: f.a })),
    deliveryInfo: {},
    sizes: [],
    colors: [],
    shortDescription: product.short_description,
    deliveryCharges: {
      inside: Number(shop.delivery_inside_charge),
      outside: Number(shop.delivery_outside_charge),
    },
    freeDeliveryThreshold: shop.free_delivery_threshold,
    // আসল অর্ডার জমার জন্য — দেখানো হয় না, শুধু ফর্ম ব্যবহার করে।
    orderContext: { shop, product },
  }
}
