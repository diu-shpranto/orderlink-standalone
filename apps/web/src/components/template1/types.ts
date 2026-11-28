// "টেমপ্লেট ১ — ইয়ারবাডস"-এর ডাটার আকার। একটাই product অবজেক্ট
// থেকে পুরো পেজ রেন্ডার হয়, যাতে যেকোনো সেলার এই টেমপ্লেট
// নিজের পণ্যে ব্যবহার করতে পারে।

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
}
