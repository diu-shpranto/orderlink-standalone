// "টেমপ্লেট ২ — ফ্যাশন ও লাইফস্টাইল"-এর ডাটার আকার। একটাই product
// অবজেক্ট + seller অবজেক্ট থেকে পুরো পেজ রেন্ডার হয়, যাতে যেকোনো
// সেলার এই টেমপ্লেট নিজের পণ্যে ব্যবহার করতে পারে।
//
// ⚠️ ডাটা-গ্যাপ (Stage 1): প্রোডাক্ট/পেজ মডেলে সাইজ, রং,
// সাইজ-গাইড, গল্প, লাইফস্টাইল, ফিচার, প্রোমো বার্তা বা ডেলিভারি
// তথ্যের আলাদা ফিল্ড নেই; অর্ডার টেবিলেও সাইজ/রংয়ের কলাম নেই।
// অ্যাডাপ্টার তাই এগুলো খালি পাঠায় — সেকশন লুকিয়ে থাকে, কখনো
// বানানো ডাটা দেখায় না। আসল ডাটা আসবে মডেল + বিল্ডার বদলে
// (Stage 2-এর সিদ্ধান্ত)। নমুনা ডাটায় (data/sampleProduct.ts)
// সব ফিল্ড ভরা থাকে, যাতে ডিজাইনটা পুরো দেখা যায়।

import type { ProductRow, ShopRow } from '../../lib/types.ts'

export type DeliveryArea = 'inside' | 'outside'

export interface TemplateTwoSeller {
  name: string
  logoUrl: string | null
  /** সেলারের ফোন — না থাকলে হেডার/ফুটারের কল বাটন দেখায় না। */
  phone: string | null
  /** WhatsApp নম্বর — না থাকলে WhatsApp বাটন দেখায় না। */
  whatsapp?: string | null
  /** দোকানের ঠিকানা — না থাকলে ফুটারে ঠিকানার লাইন আসে না। */
  address?: string | null
  facebook?: string | null
  instagram?: string | null
}

export interface TemplateTwoImage {
  /** আসল ছবির URL — না থাকলে (null) নমুনা প্লেসহোল্ডার ব্লক
      দেখায়, যাতে আসল ছবি না থাকলেও লেআউট ভাঙে না। */
  url: string | null
  alt: string
  /** ছবির পরিচয় — যেমন "সামনের দিক", "কাপড়ের বিবরণ"। */
  label?: string
}

export interface TemplateTwoColor {
  name: string
  /** সোয়াচের রং — যেমন "#FFFFFF"। */
  hex: string
}

export interface TemplateTwoSpec {
  label: string
  value: string
}

export interface TemplateTwoSizeGuideRow {
  size: string
  /** সব মাপ ইঞ্চিতে, বাংলা সংখ্যায় স্ট্রিং হিসেবে — যেমন "৩৮"। */
  chest: string
  length: string
  shoulder: string
}

export type TemplateTwoIconKind =
  | 'fabric'
  | 'fit'
  | 'design'
  | 'finish'
  | 'care'

export interface TemplateTwoHighlight {
  title: string
  text: string
  icon: TemplateTwoIconKind
}

export interface TemplateTwoStoryBlock {
  title: string
  text: string
  /** গল্পের ছবির পরিচয় — ছবি না থাকলে প্লেসহোল্ডারে দেখায়। */
  imageLabel: string
  imageUrl?: string | null
}

export interface TemplateTwoFeature {
  title: string
  text: string
  icon: TemplateTwoIconKind
}

export interface TemplateTwoReview {
  name: string
  text: string
  rating?: number
  /** কাস্টমারের ছবি — না থাকলে নামের অক্ষরের বৃত্ত দেখায়। */
  photoUrl?: string
  /** যাচাইকৃত ক্রয় — ডাটায় স্পষ্ট true থাকলেই ব্যাজ দেখায়। */
  verified?: boolean
}

export interface TemplateTwoFaq {
  q: string
  a: string
}

export interface TemplateTwoLifestyle {
  caption: string
  imageLabel: string
  imageUrl?: string | null
}

export interface TemplateTwoDeliveryInfo {
  deliveryTime?: string
  payment?: string
  exchange?: string
  returnPolicy?: string
  support?: string
}

export interface TemplateTwoProduct {
  name: string
  category: string | null
  /** সংগ্রহের লেবেল — যেমন "নতুন সংগ্রহ ২০২৬"। */
  collectionLabel?: string
  /** হিরোর বড় শিরোনাম — না থাকলে পণ্যের নামই শিরোনাম। */
  headline?: string
  /** ছবি ১–৬টি। প্রথমটাই মূল ছবি। */
  images: TemplateTwoImage[]
  price: number
  oldPrice: number | null
  /** স্টক — মডেলে স্টকের ফিল্ড নেই, তাই ঐচ্ছিক। না থাকলে
      "স্টকে আছে" লাইনটা দেখায় না (কখনো বানানো সংখ্যা দেখায় না)। */
  stock?: number
  /** রেটিং/রিভিউ সংখ্যা — আসল রিভিউ থেকেই আসে। না থাকলে
      তারার লাইনটা লুকানো থাকে। */
  rating?: number
  reviewCount?: number
  /** ছোট বিবরণ — থাকলে হিরোতে দেখায়, না থাকলে লুকানো থাকে। */
  shortDescription?: string | null
  /** সাইজ — মডেলে ফিল্ড নেই (Stage 1 গ্যাপ)। খালি থাকলে
      সাইজ সিলেক্টর দেখায় না। */
  sizes: string[]
  /** রং — মডেলে ফিল্ড নেই (Stage 1 গ্যাপ)। খালি থাকলে
      রং সিলেক্টর দেখায় না। */
  colors: TemplateTwoColor[]
  highlights: TemplateTwoHighlight[]
  story: TemplateTwoStoryBlock[]
  specs: TemplateTwoSpec[]
  /** সাইজ গাইডের সারি — মডেলে ফিল্ড নেই (Stage 1 গ্যাপ)।
      খালি থাকলে সাইজ গাইড সেকশন আসে না। */
  sizeGuide: TemplateTwoSizeGuideRow[]
  sizeGuideNote?: string
  features: TemplateTwoFeature[]
  lifestyle: TemplateTwoLifestyle[]
  /** আসল রিভিউ — না থাকলে রিভিউ সেকশনে খালি অবস্থা দেখায়
      ("এখনো কোনো রিভিউ নেই"), কখনো বানানো রিভিউ নয়। */
  reviews: TemplateTwoReview[]
  faqs: TemplateTwoFaq[]
  deliveryInfo: TemplateTwoDeliveryInfo
  /** বিশেষ অফারের বার্তা — না থাকলে আর ছাড় না থাকলে
      অফার সেকশন আসে না। */
  promoMessage?: string | null
  deliveryCharges: { inside: number; outside: number }
  /** ফ্রি-ডেলিভারি সীমা — দোকানের সেটিং থেকে আসে। */
  freeDeliveryThreshold?: number | null
  /** আসল অর্ডার জমার জন্য — অ্যাডাপ্টার থেকে আসে, দেখানো হয় না।
      ফর্ম এটা দিয়ে placeOrder ডাকে (টেমপ্লেট ১-এর মতোই)। */
  orderContext?: { shop: ShopRow; product: ProductRow }
}
