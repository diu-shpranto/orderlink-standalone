// টেমপ্লেট রেজিস্ট্রি — আপাতত খালি। ২০টি পুরনো টেমপ্লেট সরিয়ে দেওয়া
// হয়েছে (২৮ নভে ২০২৬, মালিকের সিদ্ধান্ত) — একটা একটা করে নতুন
// ডিজাইনে আবার বানানো হবে। রেজিস্ট্রি খালি থাকায় কোনো কাস্টমার
// পেজ পুরনো ডিজাইনে দেখাবে না, বিল্ডারে বাছাই করার মতো কিছু
// থাকবে না, আর নতুন পেজ প্রকাশ করা যাবে না। পুরনো টেমপ্লেটের
// কোড মুছে ফেলা হয়নি — CustomerPage-এর ব্রাঞ্চগুলো গিট
// ইতিহাসে আছে, তবে রেজিস্ট্রি খালি বলে এখন অচল (unreachable)।
// নিয়ম: ভুয়া রিভিউ/রেটিং/ছাড়/কাউন্টডাউন নেই — শুধু আসল সেভ করা ডাটা।

import type { TemplateId } from './types.ts'

export interface TemplateMeta {
  id: TemplateId
  nameBn: string
  taglineBn: string
  dark: boolean
  stickyBar: boolean
  accentClass: string
}

export const TEMPLATES: TemplateMeta[] = []

// হোম পেজের গ্যালারির তালিকা — রেজিস্ট্রির মতোই খালি।
export const INTRO_TEMPLATES: TemplateId[] = []

// রেজিস্ট্রিতে না থাকলে undefined — কলারকে গার্ড করতে হয়
// (CustomerPage বন্ধ নোটিশ দেখায়, Products '—' দেখায়)।
export function templateById(id: TemplateId): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

// পেজের সেকশন — ক্রম ও চালু/বন্ধ বিল্ডার থেকে বদলানো যায়।
export interface SectionDef {
  id: string
  labelBn: string
}

export const SECTION_DEFS: SectionDef[] = [
  { id: 'gallery', labelBn: 'ছবির গ্যালারি' },
  { id: 'description', labelBn: 'পণ্যের বিবরণ' },
  { id: 'benefits', labelBn: 'সুবিধা' },
  { id: 'specs', labelBn: 'স্পেসিফিকেশন' },
  { id: 'video', labelBn: 'ভিডিও' },
  { id: 'reviews', labelBn: 'রিভিউ' },
  { id: 'faq', labelBn: 'জিজ্ঞাসা' },
  { id: 'delivery', labelBn: 'ডেলিভারি তথ্য' },
]

export const DEFAULT_SECTIONS: Record<string, boolean> = {
  gallery: true,
  description: true,
  benefits: true,
  specs: true,
  video: true,
  reviews: true,
  faq: true,
  delivery: true,
}

export const DEFAULT_SECTION_ORDER: string[] = [
  'gallery',
  'description',
  'benefits',
  'specs',
  'video',
  'reviews',
  'faq',
  'delivery',
]
