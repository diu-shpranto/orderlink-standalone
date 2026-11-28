// "টেমপ্লেট ১ — ইয়ারবাডস"-এর ডাটার আকার। একটাই product অবজেক্ট
// থেকে পুরো পেজ রেন্ডার হয়, যাতে যেকোনো সেলার এই টেমপ্লেট
// নিজের পণ্যে ব্যবহার করতে পারে।

import type { ProductRow, ShopRow, VideoItem } from '../../lib/types.ts'

export type DeliveryArea = 'inside' | 'outside'

export interface TemplateOneSeller {
  name: string
  logoUrl: string | null
  /** সেলারের ফোন — না থাকলে হেডারের কল বাটন দেখায় না। */
  phone: string | null
}

export interface TemplateOneImage {
  url: string
  alt: string
}

export interface TemplateOneSpec {
  label: string
  value: string
}

/** ভিডিও — lib/types-এর VideoItem-ই ({url, label?})। */
export type TemplateOneVideo = VideoItem

export interface TemplateOneReview {
  name: string
  text: string
  rating?: number
  /** কাস্টমারের ছবি — না থাকলে নামের অক্ষরের বৃত্ত দেখায়। */
  photoUrl?: string
  /** রিভিউর ছবি/স্ক্রিনশট — ট্যাপ করলে লাইটবক্সে খোলে। */
  screenshotUrl?: string
  /** যাচাইকৃত ক্রয় — ডাটায় স্পষ্ট true থাকলেই ব্যাজ দেখায়। */
  verified?: boolean
}

export interface TemplateOneProduct {
  name: string
  category: string | null
  /** ছবি ১–৮টি। প্রথমটাই মূল ছবি। */
  images: TemplateOneImage[]
  price: number
  oldPrice: number | null
  /** স্টক — মডেলে স্টকের ফিল্ড নেই, তাই ঐচ্ছিক। না থাকলে
      "স্টকে আছে" লাইনটা দেখায় না (কখনো বানানো সংখ্যা দেখায় না)। */
  stock?: number
  /** রেটিং/রিভিউ সংখ্যা — আসল রিভিউ থেকেই আসে। না থাকলে
      তারার লাইনটা লুকানো থাকে। */
  rating?: number
  reviewCount?: number
  /** সুবিধা — ঠিক ৩টি দেখানোর কথা (ব্রিফ অনুযায়ী)। */
  highlights: string[]
  specs: TemplateOneSpec[]
  deliveryCharges: { inside: number; outside: number }
  /** ছোট বিবরণ — থাকলে "পণ্যের বিবরণ" ব্লকে দেখায়, না থাকলে
      সেকশনটা আসে না। */
  shortDescription?: string | null
  /** ভিডিও — pages.video_urls (+ পুরনো video_url ফলব্যাক) থেকে
      আসে। না থাকলে ভিডিও সেকশন দেখায় না। */
  videos?: TemplateOneVideo[]
  /** আসল রিভিউ — না থাকলে রিভিউ সেকশন দেখায় না। */
  reviews?: TemplateOneReview[]
  /** ফ্রি-ডেলিভারি সীমা — দোকানের সেটিং থেকে আসে। মোট এই সীমা
      ছাড়ালে ডেলিভারি চার্জ ০ হয় (lib/orders.ts-এর
      deliveryChargeFor-এর নিয়মেই) — দেখানো হিসাব আর জমা
      হওয়া চার্জ একই থাকে। */
  freeDeliveryThreshold?: number | null
  /** আসল অর্ডার জমার জন্য — অ্যাডাপ্টার থেকে আসে, দেখানো হয় না।
      প্রিভিউ/নমুনা ডাটায় থাকে না (তখন ফর্ম জমা দিলে ব্যর্থ হয়,
      কোনো অর্ডার তৈরি হয় না)। */
  orderContext?: { shop: ShopRow; product: ProductRow }
}
