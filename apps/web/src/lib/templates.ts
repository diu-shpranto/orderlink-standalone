// ১০টি ল্যান্ডিং পেজ টেমপ্লেট — বিল্ডারে সবগুলোই বাছাই করা যায়।
// হোম পেজের গ্যালারিতে শুধু ৪টি দেখানো হয় (নিচে INTRO_TEMPLATES)।
// নিয়ম: ভুয়া রিভিউ/রেটিং/ছাড়/কাউন্টডাউন নেই — শুধু আসল সেভ করা ডাটা।
// স্টিকি মোবাইল অর্ডার বার: aura/nova/social-proof/luxury-premium-এ
// শেয়ার করা বার; fashion-store-এ নিজের সবুজ বার, tech-gadget-এ নিজের
// সায়ান বার (রেজিস্ট্রিতে stickyBar: false — শেয়ার করা লাল বার যাতে
// না বসে)।

import type { TemplateId } from './types.ts'

export interface TemplateMeta {
  id: TemplateId
  nameBn: string
  taglineBn: string
  dark: boolean
  stickyBar: boolean
  accentClass: string
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'minimal-white',
    nameBn: 'Minimal White',
    taglineBn: 'পরিষ্কার সাদা, পণ্যটাই মূল আকর্ষণ',
    dark: false,
    stickyBar: false,
    accentClass: 'bg-white text-gray-900',
  },
  {
    id: 'offer-special',
    nameBn: 'Offer Special',
    taglineBn: 'ছাড়ের অফার বড় করে দেখায়',
    dark: false,
    stickyBar: false,
    accentClass: 'bg-accent text-white',
  },
  {
    id: 'modern-premium',
    nameBn: 'Modern Premium',
    taglineBn: 'গাঢ় সবুজ হেডার, প্রিমিয়াম কার্ড',
    dark: false,
    stickyBar: false,
    accentClass: 'bg-brand text-white',
  },
  {
    id: 'premium-ecommerce',
    nameBn: 'Premium E-commerce',
    taglineBn: 'দোকানের মতো দুই কলামের লেআউট',
    dark: false,
    stickyBar: false,
    accentClass: 'bg-white text-gray-900',
  },
  {
    id: 'premium-dark',
    nameBn: 'Premium Dark',
    taglineBn: 'গাঢ় অন্ধকার থিম',
    dark: true,
    stickyBar: false,
    accentClass: 'bg-gray-900 text-white',
  },
  {
    id: 'aura-premium',
    nameBn: 'Aura Premium',
    taglineBn: 'নরম গ্রেডিয়েন্ট, গোলাকার কার্ড',
    dark: false,
    stickyBar: true,
    accentClass: 'bg-brand text-white',
  },
  {
    id: 'nova-editorial',
    nameBn: 'Nova Editorial',
    taglineBn: 'ম্যাগাজিনের মতো বড় টাইপ',
    dark: false,
    stickyBar: true,
    accentClass: 'bg-gray-900 text-white',
  },
  {
    id: 'social-proof',
    nameBn: 'Social Proof',
    taglineBn: 'রিভিউ সামনে, আস্থা বাড়ায়',
    dark: false,
    stickyBar: true,
    accentClass: 'bg-brand text-white',
  },
  {
    id: 'luxury-premium',
    nameBn: 'Luxury Premium',
    taglineBn: 'কালো-সোনালি বিলাসবহুল ডার্ক থিম',
    dark: true,
    stickyBar: true,
    accentClass: 'bg-[#D6B36A] text-[#0B0B0D]',
  },
  {
    id: 'fashion-store',
    nameBn: 'Fashion Store',
    taglineBn: 'ফ্যাশন এডিটোরিয়াল, হালকা আইভরি লুক',
    dark: false,
    stickyBar: false,
    accentClass: 'bg-[#EAF3ED] text-[#1D7658]',
  },
  {
    id: 'tech-gadget',
    nameBn: 'Tech & Gadget',
    taglineBn: 'ফিউচারিস্টিক টেক লুক, গাঢ় নেভি-সায়ান থিম',
    dark: true,
    stickyBar: false,
    accentClass: 'bg-[#19C8F0] text-[#080D18]',
  },
  {
    id: 'beauty-cosmetics',
    nameBn: 'Beauty & Cosmetics',
    taglineBn: 'নরম গোলাপি বিউটি লুক, ম্যাগাজিন স্টাইল',
    dark: false,
    stickyBar: false,
    accentClass: 'bg-[#FCECEF] text-[#D86F91]',
  },
]

// হোম পেজের গ্যালারিতে ঠিক এই ৪টি দেখানো হয়।
export const INTRO_TEMPLATES: TemplateId[] = [
  'minimal-white',
  'offer-special',
  'premium-ecommerce',
  'premium-dark',
]

export function templateById(id: TemplateId): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}

// পেজের সেকশন — ক্রম ও চালু/বন্ধ বিল্ডার থেকে বদলানো যায়।
export interface SectionDef {
  id: string
  labelBn: string
}

export const SECTION_DEFS: SectionDef[] = [
  { id: 'gallery', labelBn: 'ছবির গ্যালারি' },
  { id: 'benefits', labelBn: 'সুবিধা' },
  { id: 'specs', labelBn: 'স্পেসিফিকেশন' },
  { id: 'video', labelBn: 'ভিডিও' },
  { id: 'reviews', labelBn: 'রিভিউ' },
  { id: 'faq', labelBn: 'জিজ্ঞাসা' },
]

export const DEFAULT_SECTIONS: Record<string, boolean> = {
  gallery: true,
  benefits: true,
  specs: true,
  video: true,
  reviews: true,
  faq: true,
}

export const DEFAULT_SECTION_ORDER: string[] = [
  'gallery',
  'benefits',
  'specs',
  'video',
  'reviews',
  'faq',
]
