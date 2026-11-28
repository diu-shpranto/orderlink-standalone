// বিল্ডারের খসড়া অটোসেভ — localStorage-এ রাখা হয়, যাতে ট্যাব বন্ধ
// হলেও সেভ না-করা তথ্য হারিয়ে না যায়। প্রতি পণ্যের জন্য আলাদা
// চাবি (নতুন পণ্য: 'new', এডিট: পণ্যের id) — এক পণ্যের খসড়া অন্য
// পণ্যের সেভ করা ডাটা কখনো চাপা দেবে না। ছবির ফাইল (File অবজেক্ট)
// localStorage-এ রাখা যায় না — শুধু আগেই আপলোড হওয়া ছবির URL-ই
// খসড়ায় থাকে; নতুন বাছা ফাইল ট্যাব বন্ধ হলে হারিয়ে যায় (সেটা
// dirty-চিহ্নে ধরা হয়, যাতে বন্ধ করার আগে সতর্কবার্তা আসে)।
import type {
  FaqItem,
  PageLang,
  ReviewItem,
  TemplateId,
  VideoItem,
} from './types.ts'

export interface DraftImage {
  id?: string
  storagePath: string
  url: string
  isMain: boolean
  sortOrder: number
}

export interface BuilderDraft {
  savedAt: number
  name: string
  shortDescription: string
  category: string
  priceStr: string
  oldPriceStr: string
  description: string
  benefits: string[]
  specs: { key: string; value: string }[]
  slug: string
  slugTouched: boolean
  images: DraftImage[]
  videos: VideoItem[]
  reviews: ReviewItem[]
  faqs: FaqItem[]
  deliveryInfo: string
  // টেমপ্লেট না বাছা থাকলে '' — রেজিস্ট্রি খালি বলে নতুন পণ্যে
  // এটাই ডিফল্ট; পুরনো পণ্যের সেভ করা টেমপ্লেট id অপরিবর্তিত থাকে।
  template: TemplateId | ''
  sections: Record<string, boolean>
  sectionOrder: string[]
  pageLang: PageLang
  isPublished: boolean
}

const PREFIX = 'ol-builder-draft:'

export function draftKey(productId: string | undefined): string {
  return PREFIX + (productId ?? 'new')
}

export function saveDraft(productId: string | undefined, draft: BuilderDraft) {
  try {
    localStorage.setItem(draftKey(productId), JSON.stringify(draft))
  } catch {
    // কোটা পূর্ণ বা প্রাইভেট মোড — অটোসেভ না হলেও বিল্ডার চলবে।
  }
}

export function loadDraft(
  productId: string | undefined,
): BuilderDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(productId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const d = parsed as Partial<BuilderDraft>
    if (typeof d.savedAt !== 'number') return null
    if (typeof d.name !== 'string') return null
    if (!Array.isArray(d.images) || !Array.isArray(d.videos)) return null
    if (!Array.isArray(d.reviews) || !Array.isArray(d.faqs)) return null
    if (!Array.isArray(d.sectionOrder)) return null
    return d as BuilderDraft
  } catch {
    return null
  }
}

export function clearDraft(productId: string | undefined) {
  try {
    localStorage.removeItem(draftKey(productId))
  } catch {
    // উপেক্ষা করা যায়।
  }
}
