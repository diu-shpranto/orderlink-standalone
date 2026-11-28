// "টেমপ্লেট ১ — ইয়ারবাডস"-এর অ্যাডাপ্টার — আসল ডাটা
// (CustomerPageData: দোকান + পণ্য + পেজ + ছবি) থেকে
// টেমপ্লেটের product/seller অবজেক্ট বানায়। আসল রিভিউ
// থেকেই রেটিং/সংখ্যা হিসাব হয়; রিভিউ না থাকলে তারার
// লাইন লুকানো থাকে। স্টকের ফিল্ড ডাটাবেসে নেই, তাই
// stock দেওয়া হয় না — স্টকের লাইন দেখায় না।
import type { CustomerPageData } from '../../lib/types.ts'
import type {
  TemplateOneProduct,
  TemplateOneSeller,
} from './types.ts'

export function templateOneSeller(data: CustomerPageData): TemplateOneSeller {
  return {
    name: data.shop.name,
    logoUrl: data.shop.logo_url,
    phone: data.sellerWhatsapp,
  }
}

export function templateOneProduct(
  data: CustomerPageData,
): TemplateOneProduct {
  const { product, images, page, shop } = data
  const rated = page.reviews.filter(
    (r) => typeof r.rating === 'number' && r.rating > 0,
  )
  const rating =
    rated.length > 0
      ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length
      : undefined
  return {
    name: product.name,
    category: product.category,
    images: images.slice(0, 8).map((img) => ({
      url: img.url,
      alt: product.name,
    })),
    price: Number(product.price),
    oldPrice: product.old_price,
    rating,
    reviewCount: rated.length > 0 ? rated.length : undefined,
    highlights: (product.benefits ?? []).slice(0, 3),
    specs: Object.entries(product.specs ?? {}).map(([label, value]) => ({
      label,
      value,
    })),
    deliveryCharges: {
      inside: Number(shop.delivery_inside_charge),
      outside: Number(shop.delivery_outside_charge),
    },
  }
}
