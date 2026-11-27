// শেয়ার করা টাইপ — ডাটাবেসের সারি ও পেজের ড্রাফট ডাটা।

export interface ShopRow {
  id: string
  seller_id: string
  slug: string
  name: string
  logo_url: string | null
  delivery_inside_charge: number
  delivery_outside_charge: number
  free_delivery_threshold: number | null
}

export interface ProductRow {
  id: string
  seller_id: string
  shop_id: string
  name: string
  price: number
  old_price: number | null
  description: string | null
  /** ছোট বিবরণ — নামের নিচে এক লাইনে দেখানো হয় (ঐচ্ছিক)। */
  short_description: string | null
  /** ক্যাটাগরি — পেজে ছোট লেবেল হিসেবে দেখায় (ঐচ্ছিক)। */
  category: string | null
  benefits: string[]
  specs: Record<string, string>
  created_at: string
  updated_at: string
}

export interface ProductImageRow {
  id: string
  product_id: string
  seller_id: string
  storage_path: string
  url: string
  is_main: boolean
  sort_order: number
}

export interface ReviewItem {
  name: string
  text: string
  rating?: number
  /** কাস্টমারের ছবি (Storage-এর পাবলিক URL) — ঐচ্ছিক। */
  photo_url?: string
  /** রিভিউর স্ক্রিনশট (Storage-এর পাবলিক URL) — ঐচ্ছিক, আসল আকারেই থাকে। */
  screenshot_url?: string
}

/** একাধিক ভিডিও — pages.video_urls (JSONB) এর একটি এন্ট্রি। */
export interface VideoItem {
  url: string
  /** লেবেল — যেমন "ডেমো" / "টিউটোরিয়াল" (ঐচ্ছিক)। */
  label?: string
}

export interface FaqItem {
  q: string
  a: string
}

export type PageLang = 'bn' | 'en'

export type TemplateId =
  | 'minimal-white'
  | 'offer-special'
  | 'modern-premium'
  | 'premium-ecommerce'
  | 'premium-dark'
  | 'aura-premium'
  | 'nova-editorial'
  | 'social-proof'
  | 'luxury-premium'
  | 'fashion-store'
  | 'beauty-cosmetics'
  | 'tech-gadget'
  | 'bd-single-product'
  | 'lavender-premium'
  | 'emerald-trust'
  | 'midnight-premium'
  | 'sunset-offer'
  | 'signature-pro'
  | 'classic-green'
  | 'marketplace-pro'

/** একই দোকানের অন্য প্রকাশিত পণ্য — "এই দোকানের আরও পণ্য" সারির
    জন্য (Marketplace Pro টেমপ্লেট)। fetchRelatedProducts থেকে আসে। */
export interface RelatedProductItem {
  slug: string
  name: string
  price: number
  oldPrice: number | null
  imageUrl: string | null
}

export interface PageRow {
  id: string
  product_id: string
  seller_id: string
  shop_id: string
  slug: string
  template: TemplateId
  sections: Record<string, boolean>
  section_order: string[]
  video_url: string | null
  /** একাধিক ভিডিও — [{url, label?}] (মাইগ্রেশন 0008)। না থাকলে
      পুরনো video_url-ই ব্যবহার হয় (ফলব্যাক)। */
  video_urls: VideoItem[] | null
  reviews: ReviewItem[]
  faqs: FaqItem[]
  /** ডেলিভারি তথ্য — ডেলিভারি/অর্ডার সেকশনে দেখানো হয় (ঐচ্ছিক)। */
  delivery_info: string | null
  page_lang: PageLang
  is_published: boolean
  /** ফ্রি সার্ভিসে বন্ধ পেজ (Phase 5) — প্রকাশিতই থাকে, শুধু লুকানো। */
  is_suspended: boolean
}

export interface OrderRow {
  id: string
  seller_id: string
  shop_id: string | null
  product_id: string | null
  order_code: string
  customer_name: string
  customer_phone: string
  division: string | null
  district: string | null
  upazila: string | null
  address_line: string | null
  delivery_area: 'inside' | 'outside'
  delivery_charge: number
  quantity: number
  total: number
  status: string
  sheet_status: string
  internal_notes: string
  created_at: string
  updated_at: string
}

export interface OrderEventRow {
  id: string
  order_id: string
  seller_id: string
  old_status: string | null
  new_status: string
  created_at: string
}

// কাস্টমার পেজে দেখানোর জন্য পণ্য + পেজ + ছবি — একসাথে।
export interface CustomerPageData {
  shop: ShopRow
  product: ProductRow
  images: ProductImageRow[]
  page: PageRow
  sellerWhatsapp: string | null
  /** একই দোকানের অন্য প্রকাশিত পণ্য (Marketplace Pro-র "আরও পণ্য"
      সারি)। না থাকলে (যেমন বিল্ডার প্রিভিউতে ফেচের আগে) সারিটা
      দেখায় না — কোনো টেমপ্লেটের আচরণ বদলায় না। */
  relatedProducts?: RelatedProductItem[]
}
