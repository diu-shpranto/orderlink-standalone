// "টেমপ্লেট ১ — ইয়ারবাডস"-এর অ্যাডাপ্টার — আসল ডাটা
// (CustomerPageData: দোকান + পণ্য + পেজ + ছবি) থেকে
// টেমপ্লেটের product/seller অবজেক্ট বানায়। আসল রিভিউ
// থেকেই রেটিং/সংখ্যা হিসাব হয়; রিভিউ না থাকলে তারার
// লাইন লুকানো থাকে। স্টকের ফিল্ড ডাটাবেসে নেই, তাই
// stock দেওয়া হয় না — স্টকের লাইন দেখায় না।
// ভিডিও: pages.video_urls আগে, না থাকলে পুরনো video_url
// ফলব্যাক; সেকশন বন্ধ থাকলে (sections.video === false)
// ভিডিও আসে না। রিভিউ: sections.reviews === false হলে
// রিভিউ আসে না; verified ফ্ল্যাগ শুধু ডাটায় থাকলে আসে।
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
  const videoList = (page.video_urls ?? [])
    .filter((v) => v && typeof v.url === 'string' && v.url.trim() !== '')
    .map((v) => ({
      url: v.url.trim(),
      label: v.label?.trim() ? v.label.trim() : undefined,
    }))
  const videos =
    page.sections?.['video'] === false
      ? []
      : videoList.length > 0
        ? videoList
        : page.video_url?.trim()
          ? [{ url: page.video_url.trim() }]
          : []
  const reviews =
    page.sections?.['reviews'] === false
      ? []
      : (page.reviews ?? []).map((r) => ({
          name: r.name,
          text: r.text,
          rating: r.rating,
          photoUrl: r.photo_url,
          screenshotUrl: r.screenshot_url,
          // verified শুধু ডাটায় স্পষ্ট true থাকলেই আসে — না
          // থাকলে undefined, ব্যাজ দেখায় না।
          verified: r.verified === true ? true : undefined,
        }))
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
    shortDescription: product.short_description,
    videos,
    reviews,
    freeDeliveryThreshold: shop.free_delivery_threshold,
    // আসল অর্ডার জমার জন্য — দেখানো হয় না, শুধু ফর্ম ব্যবহার করে।
    orderContext: { shop, product },
  }
}
