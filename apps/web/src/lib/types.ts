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
  reviews: ReviewItem[]
  faqs: FaqItem[]
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
}
