// কাস্টমার পেজের ভাষা — পেজের ভাষা বানানোর সময় বাছাই হয় (page_lang)।
// কাস্টমার পেজে ভাষা বদলের বোতাম নেই।

import type { PageLang } from './types.ts'

export type CustomerStrings = {
  orderNow: string
  benefits: string
  specs: string
  video: string
  reviews: string
  faq: string
  noReviews: string
  basedOnReviews: (count: number) => string
  deliveryInside: string
  deliveryOutside: string
  deliveryCharge: string
  freeDelivery: string
  description: string
  discountRunning: (pct: number) => string
  off: string
  whatsappOrder: string
  orderSoon: string
  shopPage: string
  quantity: string
}

const BN: CustomerStrings = {
  orderNow: 'অর্ডার করুন',
  benefits: 'সুবিধা',
  specs: 'স্পেসিফিকেশন',
  video: 'ভিডিও',
  reviews: 'রিভিউ',
  faq: 'জিজ্ঞাসা',
  noReviews: 'এখনো কোনো রিভিউ নেই',
  basedOnReviews: (count) => `${count}টি রিভিউয়ের ভিত্তিতে`,
  deliveryInside: 'ঢাকার ভেতরে ডেলিভারি',
  deliveryOutside: 'ঢাকার বাইরে ডেলিভারি',
  deliveryCharge: 'ডেলিভারি চার্জ',
  freeDelivery: 'ফ্রি ডেলিভারি',
  description: 'বিবরণ',
  discountRunning: (pct) => `এই পণ্যে ${pct}% ছাড় চলছে`,
  off: 'ছাড়',
  whatsappOrder: 'WhatsApp-এ অর্ডার করুন',
  orderSoon: 'অনলাইন অর্ডার শীঘ্রই চালু হচ্ছে — এখন WhatsApp-এ অর্ডার করুন।',
  shopPage: 'দোকানের পেজ',
  quantity: 'পরিমাণ',
}

const EN: CustomerStrings = {
  orderNow: 'Order Now',
  benefits: 'Benefits',
  specs: 'Specifications',
  video: 'Video',
  reviews: 'Reviews',
  faq: 'FAQ',
  noReviews: 'No reviews yet',
  basedOnReviews: (count) => `Based on ${count} reviews`,
  deliveryInside: 'Delivery inside Dhaka',
  deliveryOutside: 'Delivery outside Dhaka',
  deliveryCharge: 'Delivery charge',
  freeDelivery: 'Free delivery',
  description: 'Description',
  discountRunning: (pct) => `${pct}% off on this product`,
  off: 'off',
  whatsappOrder: 'Order on WhatsApp',
  orderSoon: 'Online ordering is coming soon — order on WhatsApp for now.',
  shopPage: 'Shop page',
  quantity: 'Quantity',
}

export function customerStrings(lang: PageLang): CustomerStrings {
  return lang === 'en' ? EN : BN
}
