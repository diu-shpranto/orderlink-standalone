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
  deliveryInfo: string
  discountRunning: (pct: number) => string
  off: string
  whatsappOrder: string
  shopPage: string
  quantity: string
  yourName: string
  phone: string
  division: string
  district: string
  upazila: string
  addressLine: string
  deliveryArea: string
  insideDhaka: string
  outsideDhaka: string
  subtotal: string
  total: string
  placeOrder: string
  placingOrder: string
  orderPlaced: string
  orderNumber: string
  orderReceived: string
  whatsappSeller: string
  duplicateWarning: (code: string) => string
  confirmAnyway: string
  backToForm: string
  orderAgain: string
  requiredField: string
  invalidPhone: string
  selectDivision: string
  selectDistrict: string
  freeDeliveryApplies: string
  freeDeliveryAbove: (amount: string) => string
  luxuryEyebrow: string
  luxuryTrustTitle: string
  luxuryTrustAuthentic: string
  luxuryTrustAuthenticDesc: string
  luxuryTrustQuality: string
  luxuryTrustQualityDesc: string
  luxuryTrustSecure: string
  luxuryTrustSecureDesc: string
  luxuryTrustFast: string
  luxuryTrustFastDesc: string
  luxuryWhyTitle: string
  luxuryWhyQuality: string
  luxuryWhyQualityDesc: string
  luxuryWhyCraft: string
  luxuryWhyCraftDesc: string
  luxuryWhyDurable: string
  luxuryWhyDurableDesc: string
  luxuryWhyPractical: string
  luxuryWhyPracticalDesc: string
  luxuryStoryTitle: string
  luxuryFeaturesTitle: string
  luxuryOfferTitle: string
  luxuryDeliveryTitle: string
  luxuryDeliverySupport: string
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
  deliveryInfo: 'ডেলিভারি তথ্য',
  discountRunning: (pct) => `এই পণ্যে ${pct}% ছাড় চলছে`,
  off: 'ছাড়',
  whatsappOrder: 'WhatsApp-এ অর্ডার করুন',
  shopPage: 'দোকানের পেজ',
  quantity: 'পরিমাণ',
  yourName: 'আপনার নাম',
  phone: 'ফোন নম্বর',
  division: 'বিভাগ',
  district: 'জেলা',
  upazila: 'উপজেলা',
  addressLine: 'বিস্তারিত ঠিকানা (বাড়ি/রোড/এলাকা)',
  deliveryArea: 'ডেলিভারি এলাকা',
  insideDhaka: 'ঢাকার ভেতরে',
  outsideDhaka: 'ঢাকার বাইরে',
  subtotal: 'পণ্যের দাম',
  total: 'মোট',
  placeOrder: 'অর্ডার করুন',
  placingOrder: 'অর্ডার হচ্ছে…',
  orderPlaced: 'অর্ডার হয়ে গেছে!',
  orderNumber: 'অর্ডার নম্বর',
  orderReceived: 'আপনার অর্ডারটি পেয়েছি। দোকান থেকে শীঘ্রই ফোনে যোগাযোগ করা হবে।',
  whatsappSeller: 'WhatsApp-এ দোকানের সঙ্গে কথা বলুন',
  duplicateWarning: (code) =>
    `এই নম্বরে গত ২৪ ঘণ্টায় একটি অর্ডার আছে (${code}) — তবুও নতুন অর্ডার করবেন?`,
  confirmAnyway: 'হ্যাঁ, তবুও অর্ডার করুন',
  backToForm: 'ফর্মে ফিরে যান',
  orderAgain: 'আরেকটি অর্ডার করুন',
  requiredField: 'এই তথ্যটা লাগবে।',
  invalidPhone: 'সঠিক মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)।',
  selectDivision: 'বিভাগ বাছুন',
  selectDistrict: 'জেলা বাছুন',
  freeDeliveryApplies: 'ফ্রি ডেলিভারি প্রযোজ্য হয়েছে',
  freeDeliveryAbove: (amount) => `${amount}-এর বেশি অর্ডারে ডেলিভারি ফ্রি`,
  luxuryEyebrow: 'প্রিমিয়াম কালেকশন',
  luxuryTrustTitle: 'আমাদের প্রতিশ্রুতি',
  luxuryTrustAuthentic: 'অরিজিনাল পণ্য',
  luxuryTrustAuthenticDesc: '১০০% আসল পণ্যের নিশ্চয়তা',
  luxuryTrustQuality: 'প্রিমিয়াম কোয়ালিটি',
  luxuryTrustQualityDesc: 'সেরা উপাদান ও নিখুঁত ফিনিশিং',
  luxuryTrustSecure: 'নিরাপদ অর্ডার',
  luxuryTrustSecureDesc: 'সহজ ও নিরাপদ অর্ডার প্রক্রিয়া',
  luxuryTrustFast: 'দ্রুত ডেলিভারি',
  luxuryTrustFastDesc: 'সারা দেশে দ্রুত ডেলিভারি',
  luxuryWhyTitle: 'কেন এই পণ্যটি বেছে নেবেন?',
  luxuryWhyQuality: 'প্রিমিয়াম মান',
  luxuryWhyQualityDesc: 'প্রতিটি পণ্য যাচাই করে সেরা মান নিশ্চিত করা হয়।',
  luxuryWhyCraft: 'নিখুঁত কারিগরি',
  luxuryWhyCraftDesc: 'অভিজ্ঞ কারিগরের হাতে যত্নে তৈরি।',
  luxuryWhyDurable: 'টেকসই ও দীর্ঘস্থায়ী',
  luxuryWhyDurableDesc: 'দীর্ঘদিন ব্যবহারের জন্য তৈরি।',
  luxuryWhyPractical: 'ব্যবহারে সুবিধাজনক',
  luxuryWhyPracticalDesc: 'দেখতে সুন্দর, ব্যবহারে আরামদায়ক।',
  luxuryStoryTitle: 'পণ্যের গল্প',
  luxuryFeaturesTitle: 'পণ্যের বৈশিষ্ট্য',
  luxuryOfferTitle: 'বিশেষ অফার',
  luxuryDeliveryTitle: 'ডেলিভারি তথ্য',
  luxuryDeliverySupport: 'সাহায্য লাগলে WhatsApp-এ মেসেজ করুন।',
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
  deliveryInfo: 'Delivery Information',
  discountRunning: (pct) => `${pct}% off on this product`,
  off: 'off',
  whatsappOrder: 'Order on WhatsApp',
  shopPage: 'Shop page',
  quantity: 'Quantity',
  yourName: 'Your name',
  phone: 'Phone number',
  division: 'Division',
  district: 'District',
  upazila: 'Upazila',
  addressLine: 'Full address (house / road / area)',
  deliveryArea: 'Delivery area',
  insideDhaka: 'Inside Dhaka',
  outsideDhaka: 'Outside Dhaka',
  subtotal: 'Product price',
  total: 'Total',
  placeOrder: 'Place Order',
  placingOrder: 'Placing order…',
  orderPlaced: 'Order placed!',
  orderNumber: 'Order number',
  orderReceived:
    'We have received your order. The shop will call you soon to confirm.',
  whatsappSeller: 'Chat with the shop on WhatsApp',
  duplicateWarning: (code) =>
    `An order already exists from this number in the last 24 hours (${code}) — place a new order anyway?`,
  confirmAnyway: 'Yes, place the order anyway',
  backToForm: 'Back to the form',
  orderAgain: 'Place another order',
  requiredField: 'This is required.',
  invalidPhone: 'Enter a valid mobile number (e.g. 01XXXXXXXXX).',
  selectDivision: 'Select division',
  selectDistrict: 'Select district',
  freeDeliveryApplies: 'Free delivery applied',
  freeDeliveryAbove: (amount) => `Free delivery on orders above ${amount}`,
  luxuryEyebrow: 'Premium Collection',
  luxuryTrustTitle: 'Our Promise',
  luxuryTrustAuthentic: 'Authentic Product',
  luxuryTrustAuthenticDesc: '100% genuine product, guaranteed',
  luxuryTrustQuality: 'Premium Quality',
  luxuryTrustQualityDesc: 'Finest materials and flawless finishing',
  luxuryTrustSecure: 'Secure Ordering',
  luxuryTrustSecureDesc: 'Simple and secure ordering',
  luxuryTrustFast: 'Fast Delivery',
  luxuryTrustFastDesc: 'Fast delivery across the country',
  luxuryWhyTitle: 'Why Choose This Product?',
  luxuryWhyQuality: 'Premium Quality',
  luxuryWhyQualityDesc: 'Every product is checked to ensure the finest quality.',
  luxuryWhyCraft: 'Fine Craftsmanship',
  luxuryWhyCraftDesc: 'Carefully crafted by skilled hands.',
  luxuryWhyDurable: 'Durable & Long-lasting',
  luxuryWhyDurableDesc: 'Built to last for years.',
  luxuryWhyPractical: 'Practical Everyday Use',
  luxuryWhyPracticalDesc: 'Beautiful to look at, comfortable to use.',
  luxuryStoryTitle: 'The Story Behind It',
  luxuryFeaturesTitle: 'Product Features',
  luxuryOfferTitle: 'Special Offer',
  luxuryDeliveryTitle: 'Delivery Information',
  luxuryDeliverySupport: 'Need help? Message us on WhatsApp.',
}

export function customerStrings(lang: PageLang): CustomerStrings {
  return lang === 'en' ? EN : BN
}
