// ল্যান্ডিং পেজ বিল্ডার — ৭ ধাপ (লাইভ অ্যাপের মতো): টেমপ্লেট → পণ্যের
// তথ্য → ছবি → ভিডিও → কাস্টমার রিভিউ → জিজ্ঞাসা → প্রিভিউ ও পাবলিশ।
// ছাড়ের % অটো-হিসাব (পুরনো দাম থেকে)। ছবি সর্বোচ্চ ৮টি, Storage-এ
// আপলোড হয় সেভের সময়। পেজের ভাষা বানানোর সময় বাছাই হয়।
// লাইভ প্রিভিউ আসল কাস্টমার পেজের কম্পোনেন্ট দিয়েই দেখায়।
import { useEffect, useRef, useState } from 'react'
import CustomerPage, { youtubeEmbedId } from '../components/CustomerPage.tsx'
import SellerShell from '../components/SellerShell.tsx'
import { useAuth } from '../lib/auth.tsx'
import {
  clearDraft,
  loadDraft,
  saveDraft,
} from '../lib/draft.ts'
import type { BuilderDraft } from '../lib/draft.ts'
import {
  discountPercent,
  formatBDT,
  slugify,
  SLUG_PATTERN,
  toBnDigits,
} from '../lib/pricing.ts'
import {
  cropImageTo43,
  fetchProductForEdit,
  fetchRelatedProducts,
  fetchSellerShop,
  MAX_IMAGES_PER_PRODUCT,
  saveProductAndPage,
  syncProductImages,
  uploadProductImage,
} from '../lib/products.ts'
import { navigate } from '../lib/router.ts'
import {
  checkStorageBeforeUpload,
  fetchUsage,
} from '../lib/subscription.ts'
import {
  DEFAULT_SECTION_ORDER,
  DEFAULT_SECTIONS,
  SECTION_DEFS,
  TEMPLATES,
} from '../lib/templates.ts'
import type { TemplateMeta } from '../lib/templates.ts'
import type {
  CustomerPageData,
  FaqItem,
  PageLang,
  RelatedProductItem,
  ReviewItem,
  ShopRow,
  TemplateId,
  VideoItem,
} from '../lib/types.ts'

/** বিল্ডারের খসড়া রিভিউ — সেভ করা ReviewItem + আপলোডের আগের ফাইল। */
interface ReviewDraft extends ReviewItem {
  photoFile?: File
  photoPreview?: string
  screenshotFile?: File
  screenshotPreview?: string
}

const MAX_VIDEOS = 5

/** তালিকার একটি আইটেম from থেকে to-তে সরায় (ড্র্যাগ-ড্রপের জন্য)। */
function reorder<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) {
    return arr
  }
  const next = [...arr]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

interface ImageItem {
  id?: string
  file?: File
  previewUrl: string
  storagePath?: string
  url?: string
  isMain: boolean
  sortOrder: number
}

const inputClass = 'mt-1 w-full rounded-2xl border border-gray-300 px-4 py-2.5'
const labelClass = 'text-sm font-bold text-gray-900'
const hintClass = 'mt-1 block text-sm text-gray-500'

const STEPS = [
  { n: 1, label: 'টেমপ্লেট' },
  { n: 2, label: 'পণ্যের তথ্য' },
  { n: 3, label: 'ছবি' },
  { n: 4, label: 'ভিডিও' },
  { n: 5, label: 'কাস্টমার রিভিউ' },
  { n: 6, label: 'জিজ্ঞাসা' },
  { n: 7, label: 'প্রিভিউ ও পাবলিশ' },
] as const

/** ধাপের কার্ড — সবুজ নম্বর ব্যাজ + শিরোনাম + ছোট বর্ণনা (রেফারেন্সের মতো)। */
function StepCard({
  n,
  title,
  subtitle,
  children,
}: {
  n: number
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-extrabold text-white">
          {toBnDigits(n)}
        </span>
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-gray-600">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  )
}

/**
 * টেমপ্লেট কার্ডের থাম্বনেইল — আসল পেজের ছোট ছবি
 * (/template-thumbs/<id>.png)। ছবি না পেলে (এখনো আপলোড হয়নি
 * বা লোড ব্যর্থ) টেমপ্লেটের নিজের রঙের বিমূর্ত প্রিভিউ দেখায়।
 */
function TemplateThumb({ t }: { t: TemplateMeta }) {
  const [imgFailed, setImgFailed] = useState(false)
  if (!imgFailed) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        <img
          src={`/template-thumbs/${t.id}.png`}
          alt=""
          className="aspect-[4/3] w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    )
  }
  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        t.dark ? 'border-gray-700 bg-[#0B0B0D]' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className={`flex h-10 items-center px-3 ${t.accentClass}`}>
        <span className="h-2.5 w-12 rounded-full bg-white/70" />
      </div>
      <div className="space-y-2 p-3">
        <div
          className={`h-3 w-3/4 rounded ${
            t.dark ? 'bg-gray-600' : 'bg-gray-300'
          }`}
        />
        <div
          className={`h-3 w-1/2 rounded ${
            t.dark ? 'bg-gray-700' : 'bg-gray-200'
          }`}
        />
      </div>
    </div>
  )
}

/** বিল্ডারের ডেস্কটপ সারাংশ প্যানেল — লাইভ তথ্য, কোনো নতুন ডাটা নয়। */
function BuilderSummary({
  name,
  priceNum,
  oldPriceNum,
  discount,
  slug,
  shopSlug,
  template,
  imageCount,
  reviewCount,
  faqCount,
  hasVideo,
  isPublished,
}: {
  name: string
  priceNum: number
  oldPriceNum: number | null
  discount: number
  slug: string
  shopSlug: string
  template: TemplateId
  imageCount: number
  reviewCount: number
  faqCount: number
  hasVideo: boolean
  isPublished: boolean
}) {
  const templateName =
    TEMPLATES.find((t) => t.id === template)?.nameBn ?? template
  return (
    <div className="sticky top-6 space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-extrabold">পেজের সারাংশ</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-500">পণ্য</dt>
            <dd className="text-right font-bold">
              {name.trim() || 'পণ্যের নাম'}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-500">দাম</dt>
            <dd className="text-right font-bold">
              {Number.isFinite(priceNum) && priceNum > 0
                ? formatBDT(priceNum)
                : '—'}
              {oldPriceNum && oldPriceNum > priceNum ? (
                <span className="ml-2 text-gray-400 line-through">
                  {formatBDT(oldPriceNum)}
                </span>
              ) : null}
            </dd>
          </div>
          {discount > 0 ? (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-gray-500">ছাড়</dt>
              <dd className="font-bold text-accent">
                {toBnDigits(discount)}% ছাড়
              </dd>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-500">ঠিকানা</dt>
            <dd className="break-all text-right font-bold">
              /{shopSlug}/{slug || '…'}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-500">টেমপ্লেট</dt>
            <dd className="text-right font-bold">{templateName}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-500">ছবি</dt>
            <dd className="font-bold">{toBnDigits(imageCount)}টি</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-500">রিভিউ</dt>
            <dd className="font-bold">{toBnDigits(reviewCount)}টি</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-500">জিজ্ঞাসা</dt>
            <dd className="font-bold">{toBnDigits(faqCount)}টি</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-500">ভিডিও</dt>
            <dd className="font-bold">{hasVideo ? 'আছে' : 'নেই'}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-gray-500">অবস্থা</dt>
            <dd className="font-bold">
              {isPublished ? 'প্রকাশিত' : 'খসড়া'}
            </dd>
          </div>
        </dl>
      </div>
      <p className="rounded-2xl bg-brand-light px-4 py-3 text-sm leading-relaxed text-brand-dark">
        ধাপ ৭-এ গেলে পাশেই লাইভ প্রিভিউ দেখা যাবে — কাস্টমার ঠিক এভাবেই
        পেজটা দেখবে।
      </p>
    </div>
  )
}

export default function ProductBuilder({
  productId,
}: {
  productId?: string
}) {
  const { seller } = useAuth()
  const [shop, setShop] = useState<ShopRow | null>(null)
  // একই দোকানের অন্য পণ্য — Marketplace Pro প্রিভিউতে "আরও পণ্য"
  // সারি দেখাতে। শুধু প্রিভিউয়ের জন্য; সেভে হাত পড়ে না।
  const [relatedProducts, setRelatedProducts] = useState<
    RelatedProductItem[]
  >([])
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [savedProductId, setSavedProductId] = useState<string | undefined>(
    productId,
  )
  const [pageId, setPageId] = useState<string | undefined>(undefined)

  // ধাপ ২ — পণ্যের তথ্য
  const [name, setName] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [category, setCategory] = useState('')
  const [priceStr, setPriceStr] = useState('')
  const [oldPriceStr, setOldPriceStr] = useState('')
  const [description, setDescription] = useState('')
  const [benefits, setBenefits] = useState<string[]>([])
  const [benefitInput, setBenefitInput] = useState('')
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([])
  const [specKey, setSpecKey] = useState('')
  const [specValue, setSpecValue] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  // ধাপ ৩-৪ — ছবি ও ভিডিও
  const [images, setImages] = useState<ImageItem[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [videoError, setVideoError] = useState('')
  const [dragImage, setDragImage] = useState<number | null>(null)
  const [dragOverImage, setDragOverImage] = useState<number | null>(null)
  const [dropZoneOver, setDropZoneOver] = useState(false)
  const [dragSection, setDragSection] = useState<number | null>(null)
  const [dragOverSection, setDragOverSection] = useState<number | null>(null)

  // ধাপ ৫-৬ — রিভিউ ও জিজ্ঞাসা
  const [reviews, setReviews] = useState<ReviewDraft[]>([])
  const [reviewName, setReviewName] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState('')
  const [reviewPhotoFile, setReviewPhotoFile] = useState<File | null>(null)
  const [reviewPhotoPreview, setReviewPhotoPreview] = useState('')
  const [reviewScreenshotFile, setReviewScreenshotFile] = useState<File | null>(null)
  const [reviewScreenshotPreview, setReviewScreenshotPreview] = useState('')
  const [faqs, setFaqs] = useState<FaqItem[]>([])
  const [faqQ, setFaqQ] = useState('')
  const [faqA, setFaqA] = useState('')
  const [deliveryInfo, setDeliveryInfo] = useState('')

  // ধাপ ১ ও ৭ — টেমপ্লেট ও প্রকাশ
  const [template, setTemplate] = useState<TemplateId>('minimal-white')
  const [sections, setSections] =
    useState<Record<string, boolean>>(DEFAULT_SECTIONS)
  const [sectionOrder, setSectionOrder] =
    useState<string[]>(DEFAULT_SECTION_ORDER)
  const [pageLang, setPageLang] = useState<PageLang>('bn')
  const [isPublished, setIsPublished] = useState(false)

  // ধাপ ৭ — প্রিভিউয়ের ডিভাইস (ডেস্কটপ / ট্যাবলেট / মোবাইল)
  const [previewDevice, setPreviewDevice] = useState<
    'desktop' | 'tablet' | 'mobile'
  >('desktop')

  // খসড়া অটোসেভ — লোড শেষে বর্তমান অবস্থাই বেসলাইন; এরপর
  // বদলালেই dirty, আর বন্ধ করার আগে সতর্কবার্তা আসে।
  const loadedRef = useRef(false)
  const snapshotRef = useRef<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  /**
   * খসড়ার তুলনাযোগ্য বিষয়বস্তু — সেভের সময় (savedAt) ছাড়া, যাতে
   * বেসলাইনের সঙ্গে তুলনা করা যায়। আপলোড হয়নি এমন ছবি/রিভিউর
   * ফাইল localStorage-এ যায় না — শুধু আগেই আপলোড হওয়া URL-ই
   * খসড়ায় থাকে।
   */
  function draftContent() {
    return {
      name,
      shortDescription,
      category,
      priceStr,
      oldPriceStr,
      description,
      benefits,
      specs,
      slug,
      slugTouched,
      images: images
        .filter((img) => !img.file && img.storagePath && img.url)
        .map((img) => ({
          id: img.id,
          storagePath: img.storagePath ?? '',
          url: img.url ?? '',
          isMain: img.isMain,
          sortOrder: img.sortOrder,
        })),
      videos,
      reviews: reviews.map((r) => ({
        name: r.name,
        text: r.text,
        ...(typeof r.rating === 'number' ? { rating: r.rating } : {}),
        ...(r.photo_url ? { photo_url: r.photo_url } : {}),
        ...(r.screenshot_url ? { screenshot_url: r.screenshot_url } : {}),
      })),
      faqs,
      deliveryInfo,
      template,
      sections,
      sectionOrder,
      pageLang,
      isPublished,
    }
  }

  /** সেভ করা খসড়া ফর্মে বসানো — শুধু মিলে যাওয়া পণ্যের খসড়াই
      এখানে আসে (চাবি পণ্যের id অনুযায়ী)। */
  function applyDraft(d: BuilderDraft) {
    setName(d.name ?? '')
    setShortDescription(d.shortDescription ?? '')
    setCategory(d.category ?? '')
    setPriceStr(d.priceStr ?? '')
    setOldPriceStr(d.oldPriceStr ?? '')
    setDescription(d.description ?? '')
    setBenefits(Array.isArray(d.benefits) ? d.benefits : [])
    setSpecs(Array.isArray(d.specs) ? d.specs : [])
    setSlug(d.slug ?? '')
    setSlugTouched(!!d.slugTouched)
    setImages(
      (d.images ?? []).map((img, i) => ({
        id: img.id,
        previewUrl: img.url,
        storagePath: img.storagePath,
        url: img.url,
        isMain: img.isMain,
        sortOrder: img.sortOrder ?? i,
      })),
    )
    setVideos(Array.isArray(d.videos) ? d.videos : [])
    setReviews((d.reviews ?? []).map((r) => ({ ...r })))
    setFaqs(Array.isArray(d.faqs) ? d.faqs : [])
    setDeliveryInfo(d.deliveryInfo ?? '')
    setTemplate(d.template ?? 'minimal-white')
    setSections({ ...DEFAULT_SECTIONS, ...(d.sections ?? {}) })
    setSectionOrder(
      Array.isArray(d.sectionOrder) && d.sectionOrder.length > 0
        ? d.sectionOrder
        : DEFAULT_SECTION_ORDER,
    )
    setPageLang(d.pageLang ?? 'bn')
    setIsPublished(!!d.isPublished)
  }

  useEffect(() => {
    if (!seller) return
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const shopRow = await fetchSellerShop(seller.id)
        if (!mounted) return
        setShop(shopRow)
        let serverUpdatedAtMs = NaN
        if (productId) {
          const existing = await fetchProductForEdit(productId, seller.id)
          if (!mounted || !existing) return
          const p = existing.product
          serverUpdatedAtMs = Date.parse(p.updated_at) || NaN
          setName(p.name)
          setShortDescription(p.short_description ?? '')
          setCategory(p.category ?? '')
          setPriceStr(String(p.price))
          setOldPriceStr(p.old_price ? String(p.old_price) : '')
          setDescription(p.description ?? '')
          setBenefits(p.benefits)
          setSpecs(
            Object.entries(p.specs).map(([key, value]) => ({ key, value })),
          )
          setImages(
            existing.images.map((img, i) => ({
              id: img.id,
              previewUrl: img.url,
              storagePath: img.storage_path,
              url: img.url,
              isMain: img.is_main,
              sortOrder: i,
            })),
          )
          if (existing.page) {
            setPageId(existing.page.id)
            setSlug(existing.page.slug)
            setSlugTouched(true)
            setTemplate(existing.page.template)
            setSections({ ...DEFAULT_SECTIONS, ...existing.page.sections })
            // নতুন সেকশন (বিবরণ/ডেলিভারি) পুরনো পেজের সেভ করা ক্রমে
            // নেই — ডিফল্ট ক্রমে শেষে যোগ হয় (চালু অবস্থায়, উপরের
            // sections-মার্জের মতোই — অনুপস্থিত মানেই চালু)। লাইভ
            // পেজ সেভ না করা পর্যন্ত বদলায় না; সেলার চাইলে ধাপ ১-এ
            // আনচেক করে দিতে পারে।
            setSectionOrder((() => {
              const loaded = [...existing.page.section_order]
              for (const id of DEFAULT_SECTION_ORDER) {
                if (!loaded.includes(id)) loaded.push(id)
              }
              return loaded
            })())
            setVideos(
              (existing.page.video_urls ?? []).length > 0
                ? (existing.page.video_urls ?? []).map((v) => ({
                    url: v.url,
                    label: v.label,
                  }))
                : existing.page.video_url
                  ? [{ url: existing.page.video_url }]
                  : [],
            )
            setReviews(existing.page.reviews.map((r) => ({ ...r })))
            setFaqs(existing.page.faqs)
            setDeliveryInfo(existing.page.delivery_info ?? '')
            setPageLang(existing.page.page_lang)
            setIsPublished(existing.page.is_published)
          }
        }
        // খসড়া ফেরানো — চাবি পণ্য অনুযায়ী, তাই অন্য পণ্যের ডাটা
        // চাপা পড়ে না। এডিটের ক্ষেত্রে খসড়া সার্ভারের আপডেটের
        // চেয়ে নতুন হলেই বসে — অন্য কোথাও সেভ হয়ে গেলে পুরনো
        // খসড়া বাদ যায়। নতুন পণ্যে খসড়া থাকলেই বসে।
        const draft = loadDraft(productId)
        if (draft) {
          if (
            !productId ||
            Number.isNaN(serverUpdatedAtMs) ||
            draft.savedAt >= serverUpdatedAtMs
          ) {
            applyDraft(draft)
          } else {
            clearDraft(productId)
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'লোড করা যায়নি।')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [seller, productId])

  // লোড শেষে বর্তমান অবস্থাই বেসলাইন — এরপর বদলালেই dirty।
  useEffect(() => {
    if (loading) return
    if (snapshotRef.current === null) {
      snapshotRef.current = JSON.stringify(draftContent())
    }
    loadedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // খসড়া অটোসেভ — বদলালে ৫০০ মি.সে. পরে localStorage-এ লেখে।
  // এখনো আপলোড হয়নি এমন ছবি/রিভিউর ফাইল থাকলেও dirty ধরা হয়
  // (ফাইলটা খসড়ায় না গেলেও, বন্ধ করার আগে সতর্কবার্তা আসবে)।
  const hasUnsavedFiles =
    images.some((img) => !!img.file) ||
    reviews.some((r) => !!r.photoFile || !!r.screenshotFile)
  useEffect(() => {
    if (!loadedRef.current || snapshotRef.current === null) return
    const contentJson = JSON.stringify(draftContent())
    const dirty =
      contentJson !== snapshotRef.current || hasUnsavedFiles
    setIsDirty(dirty)
    if (!dirty || contentJson === snapshotRef.current) return
    const t = window.setTimeout(() => {
      saveDraft(savedProductId ?? productId, {
        ...JSON.parse(contentJson),
        savedAt: Date.now(),
      })
    }, 500)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    shortDescription,
    category,
    priceStr,
    oldPriceStr,
    description,
    benefits,
    specs,
    slug,
    slugTouched,
    images,
    videos,
    reviews,
    faqs,
    deliveryInfo,
    template,
    sections,
    sectionOrder,
    pageLang,
    isPublished,
    savedProductId,
    productId,
    hasUnsavedFiles,
  ])

  // একই দোকানের অন্য প্রকাশিত পণ্য — Marketplace Pro প্রিভিউয়ের
  // "আরও পণ্য" সারির জন্য। স্লাগ বদলালে ৪০০ মি.সে. পরে ফেচ হয়
  // (টাইপের সময় বারবার নয়); না পেলে সারিটা লুকিয়ে যায়।
  useEffect(() => {
    if (!shop) return
    const t = window.setTimeout(() => {
      fetchRelatedProducts(shop.id, slug || '')
        .then(setRelatedProducts)
        .catch(() => setRelatedProducts([]))
    }, 400)
    return () => window.clearTimeout(t)
  }, [shop, slug])

  // সেভ না-করা খসড়া থাকলে ট্যাব বন্ধ/রিলোডের আগে সতর্কবার্তা।
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const priceNum = Number(priceStr)
  const oldPriceNum = oldPriceStr.trim() === '' ? null : Number(oldPriceStr)
  const discount = discountPercent(
    Number.isFinite(priceNum) ? priceNum : 0,
    oldPriceNum,
  )

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  function validateInfo(): string {
    if (!name.trim()) return 'পণ্যের নাম দিন।'
    if (!Number.isFinite(priceNum) || priceNum <= 0)
      return 'সঠিক দাম দিন (০-এর বেশি)।'
    if (
      oldPriceStr.trim() !== '' &&
      (!Number.isFinite(oldPriceNum) || (oldPriceNum ?? 0) < 0)
    ) {
      return 'পুরনো দামে সঠিক সংখ্যা দিন।'
    }
    return ''
  }

  function validateVideos(): string {
    for (const v of videos) {
      const url = v.url.trim()
      if (url && !youtubeEmbedId(url)) {
        return 'সঠিক YouTube লিংক দিন (youtube.com বা youtu.be) — অন্য লিংক পেজে দেখাবে না।'
      }
    }
    return ''
  }

  function validateSlug(): string {
    if (!SLUG_PATTERN.test(slug)) {
      return 'লিংকের নামে শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন (-) চলবে।'
    }
    return ''
  }

  async function addFiles(files: FileList | null) {
    if (!files) return
    const picked = Array.from(files).filter((f) =>
      f.type.startsWith('image/'),
    )
    if (picked.length === 0) return
    if (images.length + picked.length > MAX_IMAGES_PER_PRODUCT) {
      setError(
        `একটি প্রোডাক্টে সর্বোচ্চ ${toBnDigits(MAX_IMAGES_PER_PRODUCT)}টি ছবি রাখা যাবে।`,
      )
      return
    }
    setError('')
    // বাছার সাথে সাথেই ৪:৩-এ অটো ক্রপ — প্রিভিউতে কাটা ছবিটাই
    // দেখাবে, সেভ করলে ঠিক এই ছবিটাই পাবলিশ হবে।
    const cropped = await Promise.all(picked.map((f) => cropImageTo43(f)))
    setImages((prev) => [
      ...prev,
      ...cropped.map((file, i) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        isMain: prev.length === 0 && i === 0,
        sortOrder: prev.length + i,
      })),
    ])
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const removed = prev[index]
      if (removed?.file) URL.revokeObjectURL(removed.previewUrl)
      const next = prev.filter((_, i) => i !== index)
      if (removed?.isMain && next.length > 0) {
        next[0] = { ...next[0], isMain: true }
      }
      return next.map((img, i) => ({ ...img, sortOrder: i }))
    })
  }

  function moveImage(index: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      const tmp = next[index]
      next[index] = next[target]
      next[target] = tmp
      return next.map((img, i) => ({ ...img, sortOrder: i }))
    })
  }

  function moveSection(index: number, dir: -1 | 1) {
    setSectionOrder((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      const tmp = next[index]
      next[index] = next[target]
      next[target] = tmp
      return next
    })
  }

  /** ছবি টেনে from থেকে to-তে সাজানো (↑/↓ বোতামের মতোই ক্রম বদলায়)। */
  function moveImageTo(from: number, to: number) {
    setImages((prev) =>
      reorder(prev, from, to).map((img, i) => ({ ...img, sortOrder: i })),
    )
  }

  /** সেকশন টেনে from থেকে to-তে সাজানো। */
  function moveSectionTo(from: number, to: number) {
    setSectionOrder((prev) => reorder(prev, from, to))
  }

  /** একটি ছবি বদলানো — নতুন ফাইল ৪:৩-এ কেটে বসে; পুরনো ফাইল
      সেভের সময় স্টোরেজ থেকে মুছে যাবে। */
  async function replaceImage(index: number, file: File | null) {
    if (!file || !file.type.startsWith('image/')) return
    const cropped = await cropImageTo43(file)
    setImages((prev) =>
      prev.map((img, i) => {
        if (i !== index) return img
        if (img.file) URL.revokeObjectURL(img.previewUrl)
        return {
          ...img,
          file: cropped,
          previewUrl: URL.createObjectURL(cropped),
        }
      }),
    )
  }

  /** রিভিউর কাস্টমারের ছবি — পণ্যের ছবির মতো ৪:৩-এ কেটে নেওয়া হয়। */
  async function pickReviewPhoto(file: File | null) {
    if (!file || !file.type.startsWith('image/')) return
    const cropped = await cropImageTo43(file)
    if (reviewPhotoPreview) URL.revokeObjectURL(reviewPhotoPreview)
    setReviewPhotoFile(cropped)
    setReviewPhotoPreview(URL.createObjectURL(cropped))
  }

  /** রিভিউর স্ক্রিনশট — আসল আকারেই থাকে, কাটা হয় না। */
  function pickReviewScreenshot(file: File | null) {
    if (!file || !file.type.startsWith('image/')) return
    if (reviewScreenshotPreview) URL.revokeObjectURL(reviewScreenshotPreview)
    setReviewScreenshotFile(file)
    setReviewScreenshotPreview(URL.createObjectURL(file))
  }

  async function handleSave(publish: boolean) {
    setError('')
    setNotice('')
    const infoError = validateInfo()
    if (infoError) {
      setError(infoError)
      setStep(2)
      return
    }
    const slugError = validateSlug()
    if (slugError) {
      setError(slugError)
      setStep(7)
      return
    }
    const videoErr = validateVideos()
    if (videoErr) {
      setError(videoErr)
      setStep(4)
      return
    }
    if (!seller || !shop) {
      setError('দোকানের তথ্য পাওয়া যায়নি — আবার লগইন করুন।')
      return
    }
    setBusy(true)
    try {
      // নতুন ছবির মোট সাইজ স্টোরেজের সীমার মধ্যে আছে কি — সীমা
      // ছাড়ালে আপলোডের আগেই বাংলায় ভুল দেখাবে।
      const newBytes =
        images.reduce(
          (sum, img) => sum + (img.file ? img.file.size : 0),
          0,
        ) +
        reviews.reduce(
          (sum, r) =>
            sum +
            (r.photoFile ? r.photoFile.size : 0) +
            (r.screenshotFile ? r.screenshotFile.size : 0),
          0,
        )
      if (newBytes > 0) {
        await checkStorageBeforeUpload(seller.id, newBytes)
      }
      // নতুন ছবি Storage-এ আপলোড (আগে থেকে থাকা ছবি আবার আপলোড হয় না)।
      const resolved: {
        id?: string
        storagePath: string
        url: string
        isMain: boolean
        sortOrder: number
      }[] = []
      for (const img of images) {
        if (img.file) {
          const uploaded = await uploadProductImage(img.file, seller.id)
          resolved.push({
            id: img.id,
            storagePath: uploaded.storagePath,
            url: uploaded.url,
            isMain: img.isMain,
            sortOrder: img.sortOrder,
          })
        } else if (img.storagePath && img.url) {
          resolved.push({
            id: img.id,
            storagePath: img.storagePath,
            url: img.url,
            isMain: img.isMain,
            sortOrder: img.sortOrder,
          })
        }
      }
      const specsRecord: Record<string, string> = {}
      for (const s of specs) {
        if (s.key.trim()) specsRecord[s.key.trim()] = s.value.trim()
      }
      // রিভিউর ছবি/স্ক্রিনশট আপলোড — ছবি ৪:৩-এ কেটে (পণ্যের ছবির
      // মতো), স্ক্রিনশট আসল আকারেই যায় (ক্রপ হয় না)।
      const resolvedReviews: ReviewItem[] = []
      for (const r of reviews) {
        let photoUrl = r.photo_url
        let screenshotUrl = r.screenshot_url
        if (r.photoFile) {
          const up = await uploadProductImage(r.photoFile, seller.id)
          photoUrl = up.url
          if (r.photoPreview) URL.revokeObjectURL(r.photoPreview)
        }
        if (r.screenshotFile) {
          const up = await uploadProductImage(r.screenshotFile, seller.id, {
            crop: false,
          })
          screenshotUrl = up.url
          if (r.screenshotPreview)
            URL.revokeObjectURL(r.screenshotPreview)
        }
        resolvedReviews.push({
          name: r.name,
          text: r.text,
          ...(typeof r.rating === 'number' ? { rating: r.rating } : {}),
          ...(photoUrl ? { photo_url: photoUrl } : {}),
          ...(screenshotUrl ? { screenshot_url: screenshotUrl } : {}),
        })
      }
      // নতুন ফিল্ডসহ সেভ; মাইগ্রেশন 0006 এখনো লাইভে না চললে ডাটাবেস
      // কলাম চিনবে না — তখন শুধু নতুন ফিল্ড বাদ দিয়ে আবার সেভ হবে,
      // বাকি সব ঠিকঠাক সেভ হবে (সেভ ভাঙবে না)।
      let newFieldsDropped = false
      const saveArgs = (withNewFields: boolean) => ({
        sellerId: seller.id,
        shopId: shop.id,
        productId: savedProductId,
        product: {
          name: name.trim(),
          price: priceNum,
          oldPrice: oldPriceNum,
          description: description.trim(),
          ...(withNewFields
            ? { shortDescription, category }
            : {}),
          benefits: benefits.filter((b) => b.trim() !== ''),
          specs: specsRecord,
        },
        page: {
          slug: slug.trim(),
          template,
          sections,
          sectionOrder,
          videoUrl: videos[0]?.url.trim() ?? '',
          videoUrls: videos.map((v) => ({
            url: v.url.trim(),
            ...(v.label?.trim() ? { label: v.label.trim() } : {}),
          })),
          reviews: resolvedReviews,
          faqs,
          ...(withNewFields ? { deliveryInfo } : {}),
          pageLang,
          isPublished: publish,
        },
      })
      let saved: {
        productId: string
        pageId: string
        videoUrlsDropped?: boolean
      }
      try {
        saved = await saveProductAndPage(saveArgs(true))
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (/short_description|delivery_info|category/.test(msg)) {
          newFieldsDropped = true
          saved = await saveProductAndPage(saveArgs(false))
        } else {
          throw err
        }
      }
      const { productId: savedId, pageId: savedPageId } = saved
      await syncProductImages(savedId, seller.id, resolved)
      // আপলোড হওয়া রিভিউর ছবির URL-ই এখন খসড়ায় থাকবে — ফাইল আর
      // নয়, তাই দ্বিতীয়বার সেভ করলে আবার আপলোড হবে না।
      setReviews(resolvedReviews.map((r) => ({ ...r })))
      // ব্যবহারের হিসাব তাজা করা (স্টোরেজের পরিমাণ) — ব্যর্থ হলেও
      // সেভ আটকাবে না।
      void fetchUsage(seller.id).catch(() => undefined)
      setSavedProductId(savedId)
      setPageId(savedPageId)
      setIsPublished(publish)
      // সেভ হয়ে গেছে — খসড়া মুছে ফেলা, বেসলাইন তাজা করা।
      clearDraft(savedProductId ?? productId)
      clearDraft(savedId)
      snapshotRef.current = JSON.stringify(draftContent())
      setIsDirty(false)
      setNotice(
        (publish
          ? 'পেজটি প্রকাশ করা হয়েছে।'
          : 'সেভ হয়েছে — খসড়া হিসেবে আছে, প্রকাশ করলে লিংকটা কাজ করবে।') +
          (newFieldsDropped
            ? ' তবে ছোট বিবরণ, ক্যাটাগরি ও ডেলিভারি তথ্য সেভ হয়নি — ডাটাবেস আপডেট বাকি আছে।'
            : '') +
          (saved.videoUrlsDropped
            ? ' ভিডিওর তালিকা সেভ হয়নি — ডাটাবেস আপডেট বাকি আছে (শুধু প্রথম ভিডিওটা সেভ হয়েছে)।'
            : ''),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'সেভ করা যায়নি।')
    } finally {
      setBusy(false)
    }
  }

  const previewData: CustomerPageData | null =
    seller && shop
      ? {
          shop,
          product: {
            id: savedProductId ?? 'draft',
            seller_id: seller.id,
            shop_id: shop.id,
            name: name.trim() || 'পণ্যের নাম',
            price: Number.isFinite(priceNum) ? priceNum : 0,
            old_price: oldPriceNum,
            description: description.trim() || null,
            short_description: shortDescription.trim() || null,
            category: category.trim() || null,
            benefits: benefits.filter((b) => b.trim() !== ''),
            specs: Object.fromEntries(
              specs
                .filter((s) => s.key.trim())
                .map((s) => [s.key.trim(), s.value.trim()]),
            ),
            created_at: '',
            updated_at: '',
          },
          images: images.map((img, i) => ({
            id: img.id ?? `draft-${i}`,
            product_id: savedProductId ?? 'draft',
            seller_id: seller.id,
            storage_path: img.storagePath ?? '',
            url: img.previewUrl,
            is_main: img.isMain,
            sort_order: i,
          })),
          page: {
            id: pageId ?? 'draft',
            product_id: savedProductId ?? 'draft',
            seller_id: seller.id,
            shop_id: shop.id,
            slug: slug || 'draft',
            template,
            sections,
            section_order: sectionOrder,
            video_url: videos[0]?.url.trim() || null,
            video_urls: videos.map((v) => ({
              url: v.url.trim(),
              ...(v.label?.trim() ? { label: v.label.trim() } : {}),
            })),
            // খসড়া রিভিউর ছবি/স্ক্রিনশট (এখনো আপলোড হয়নি) প্রিভিউতে
            // দেখাতে অস্থায়ী preview URL-ই photo/screenshot হিসেবে
            // যায় — সেভের পর আসল Storage URL বসে।
            reviews: reviews.map((r) => ({
              ...r,
              photo_url: r.photoPreview ?? r.photo_url,
              screenshot_url: r.screenshotPreview ?? r.screenshot_url,
            })),
            faqs,
            delivery_info: deliveryInfo.trim() || null,
            page_lang: pageLang,
            is_published: isPublished,
            is_suspended: false,
          },
          sellerWhatsapp: seller.whatsapp,
          relatedProducts,
        }
      : null

  if (loading) {
    return (
      <SellerShell active="products">
        <p className="text-gray-600">লোড হচ্ছে…</p>
      </SellerShell>
    )
  }

  if (!shop) {
    return (
      <SellerShell active="products">
        <p className="text-gray-600">
          দোকান পাওয়া যায়নি — প্রথমে সেটআপ উইজার্ড শেষ করুন।
        </p>
      </SellerShell>
    )
  }

  const summaryProps = {
    name,
    priceNum,
    oldPriceNum,
    discount,
    slug,
    shopSlug: shop.slug,
    template,
    imageCount: images.length,
    reviewCount: reviews.length,
    faqCount: faqs.length,
    hasVideo: videos.some((v) => v.url.trim() !== ''),
    isPublished,
  }

  const goNext = () => {
    if (step === 2) {
      const err = validateInfo()
      if (err) {
        setError(err)
        return
      }
      setError('')
    }
    if (step === 4) {
      const err = validateVideos()
      if (err) {
        setError(err)
        return
      }
      setError('')
    }
    setStep((s) => Math.min(7, s + 1))
  }

  return (
    <SellerShell active="products">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            ল্যান্ডিং পেজ বিল্ডার
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            ধাপে ধাপে তথ্য দিন — ডানদিকে (মোবাইলে প্রিভিউ বোতামে) লাইভ
            প্রিভিউ দেখুন, শেষে পাবলিশ করুন।
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep(7)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold xl:hidden"
          >
            👁 প্রিভিউ দেখুন
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/products')}
            className="text-sm font-semibold text-brand-dark underline"
          >
            ← তালিকায় ফিরুন
          </button>
        </div>
      </div>

      <ol className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm">
        {STEPS.map((s) => (
          <li key={s.n} className="shrink-0">
            <button
              type="button"
              onClick={() => setStep(s.n)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 font-semibold ${
                step === s.n
                  ? 'border-brand bg-brand-light text-brand-dark'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                  step === s.n ? 'bg-brand' : 'bg-gray-400'
                }`}
              >
                {toBnDigits(s.n)}
              </span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-4 rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark">
          {notice}
          {isPublished && savedProductId ? (
            <>
              {' '}
              <a
                href={`/${shop.slug}/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="font-bold underline"
              >
                পেজটা দেখুন
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {step === 1 && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0 space-y-5">
            <StepCard
              n={1}
              title="টেমপ্লেট বাছুন"
              subtitle="টেমপ্লেট বদলালে শুধু ডিজাইন বদলাবে — কোনো তথ্য মুছবে না"
            >
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`rounded-2xl border-2 p-3 text-left ${
                      template === t.id
                        ? 'border-brand bg-brand-light'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <TemplateThumb t={t} />
                    <span className="mt-3 block font-bold text-gray-900">
                      {t.nameBn}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-gray-600">
                      {t.taglineBn}
                    </span>
                    {t.stickyBar ? (
                      <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                        স্টিকি অর্ডার বার
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </StepCard>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-bold text-gray-900">সেকশন চালু/বন্ধ ও ক্রম</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                সারি টেনে ক্রম বদলান — টাচে ↑ ↓ বোতাম ব্যবহার করুন
              </p>
              <ul className="mt-3 space-y-2">
                {sectionOrder.map((sectionId, i) => {
                  const def = SECTION_DEFS.find((d) => d.id === sectionId)
                  if (!def) return null
                  return (
                    <li
                      key={sectionId}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(i))
                        e.dataTransfer.effectAllowed = 'move'
                        setDragSection(i)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        if (dragOverSection !== i) setDragOverSection(i)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const from = Number(
                          e.dataTransfer.getData('text/plain'),
                        )
                        if (Number.isFinite(from)) moveSectionTo(from, i)
                        setDragSection(null)
                        setDragOverSection(null)
                      }}
                      onDragEnd={() => {
                        setDragSection(null)
                        setDragOverSection(null)
                      }}
                      className={`flex cursor-grab items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 active:cursor-grabbing ${
                        dragOverSection === i
                          ? 'ring-2 ring-brand'
                          : ''
                      } ${dragSection === i ? 'opacity-50' : ''}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className="cursor-grab select-none text-gray-400"
                          aria-hidden="true"
                        >
                          ⋮⋮
                        </span>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={sections[sectionId] !== false}
                            onChange={(e) =>
                              setSections((prev) => ({
                                ...prev,
                                [sectionId]: e.target.checked,
                              }))
                            }
                          />
                          {def.labelBn}
                        </label>
                      </span>
                      <span className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveSection(i, -1)}
                          disabled={i === 0}
                          className="rounded bg-white px-2 py-1 text-sm disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(i, 1)}
                          disabled={i === sectionOrder.length - 1}
                          className="rounded bg-white px-2 py-1 text-sm disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-brand px-6 py-2.5 font-semibold text-white"
              >
                পরের ধাপ →
              </button>
            </div>
          </div>
          <div className="hidden xl:block">
            <BuilderSummary {...summaryProps} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0 space-y-5">
            <StepCard n={2} title="পণ্যের তথ্য">
              <div>
                <span className={labelClass}>পেজের ভাষা</span>
                <div className="mt-1 flex overflow-hidden rounded-2xl border border-gray-300">
                  <button
                    type="button"
                    onClick={() => setPageLang('bn')}
                    className={`flex-1 py-2.5 font-bold ${
                      pageLang === 'bn'
                        ? 'bg-brand text-white'
                        : 'bg-white text-gray-700'
                    }`}
                  >
                    বাংলা
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageLang('en')}
                    className={`flex-1 py-2.5 font-bold ${
                      pageLang === 'en'
                        ? 'bg-brand text-white'
                        : 'bg-white text-gray-700'
                    }`}
                  >
                    English
                  </button>
                </div>
                <span className={hintClass}>
                  এই ফর্মের সব বক্স আর কাস্টমারের পেজ — দুটোই এই ভাষায় হবে
                </span>
              </div>
              <label className="block">
                <span className={labelClass}>নাম *</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={inputClass}
                  placeholder="যেমন: প্রিমিয়াম লেদার ওয়ালেট"
                />
              </label>
              <label className="block">
                <span className={labelClass}>ছোট বিবরণ</span>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className={inputClass}
                  placeholder="যেমন: ১০০% আসল চামড়া, হাতে সেলাই করা"
                />
                <span className={hintClass}>
                  নামের নিচে এক লাইনে দেখানো হবে
                </span>
              </label>
              <label className="block">
                <span className={labelClass}>ক্যাটাগরি</span>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                  placeholder="যেমন: ফ্যাশন"
                />
                <span className={hintClass}>
                  ঐচ্ছিক — পেজে ছোট লেবেল হিসেবে দেখাবে
                </span>
              </label>
              <label className="block">
                <span className={labelClass}>বিস্তারিত বিবরণ</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputClass}
                  placeholder="পণ্যটা সম্পর্কে বিস্তারিত লিখুন"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>দাম (৳) *</span>
                  <input
                    type="number"
                    required
                    min={0}
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    className={inputClass}
                    placeholder="850"
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>পুরনো দাম (৳)</span>
                  <input
                    type="number"
                    min={0}
                    value={oldPriceStr}
                    onChange={(e) => setOldPriceStr(e.target.value)}
                    className={inputClass}
                    placeholder="1200"
                  />
                </label>
              </div>
              {discount > 0 ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-accent">
                  {toBnDigits(discount)}% ছাড় দেখাবে ({formatBDT(priceNum)} —
                  আগে {formatBDT(oldPriceNum ?? 0)})
                </p>
              ) : null}
              <div>
                <span className={labelClass}>সুবিধা</span>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    className="min-w-0 flex-1 rounded-2xl border border-gray-300 px-4 py-2.5"
                    placeholder="যেমন: আসল চামড়া"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (benefitInput.trim()) {
                        setBenefits((prev) => [...prev, benefitInput.trim()])
                        setBenefitInput('')
                      }
                    }}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
                  >
                    যোগ করুন
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {benefits.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                    >
                      {b}
                      <button
                        type="button"
                        onClick={() =>
                          setBenefits((prev) =>
                            prev.filter((_, j) => j !== i),
                          )
                        }
                        className="text-red-600"
                        aria-label="মুছুন"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className={labelClass}>স্পেসিফিকেশন</span>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={specKey}
                    onChange={(e) => setSpecKey(e.target.value)}
                    className="min-w-0 flex-1 rounded-2xl border border-gray-300 px-4 py-2.5"
                    placeholder="যেমন: উপাদান"
                  />
                  <input
                    type="text"
                    value={specValue}
                    onChange={(e) => setSpecValue(e.target.value)}
                    className="min-w-0 flex-1 rounded-2xl border border-gray-300 px-4 py-2.5"
                    placeholder="যেমন: আসল চামড়া"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (specKey.trim()) {
                        setSpecs((prev) => [
                          ...prev,
                          { key: specKey.trim(), value: specValue.trim() },
                        ])
                        setSpecKey('')
                        setSpecValue('')
                      }
                    }}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
                  >
                    যোগ করুন
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {specs.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                    >
                      <span>
                        {s.key}: {s.value}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSpecs((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="text-red-600"
                        aria-label="মুছুন"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </StepCard>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 font-semibold"
              >
                ← আগের ধাপ
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-brand px-6 py-2.5 font-semibold text-white"
              >
                পরের ধাপ →
              </button>
            </div>
          </div>
          <div className="hidden xl:block">
            <BuilderSummary {...summaryProps} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0 space-y-5">
            <StepCard
              n={3}
              title="ছবি"
              subtitle={`পণ্যের ছবি যোগ করুন — সর্বোচ্চ ${toBnDigits(MAX_IMAGES_PER_PRODUCT)}টি · ছবি নিজে থেকে ৪:৩ আকারে কেটে নেওয়া হবে`}
            >
              <label
                className={`block cursor-pointer rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm text-gray-600 ${
                  dropZoneOver
                    ? 'border-brand bg-brand-light'
                    : 'border-gray-300'
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'copy'
                  setDropZoneOver(true)
                }}
                onDragLeave={() => setDropZoneOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDropZoneOver(false)
                  void addFiles(e.dataTransfer.files)
                }}
              >
                ছবি বাছুন বা এখানে টেনে ছাড়ুন (একসাথে একাধিক)
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((img, i) => (
                    <div
                      key={img.id ?? `new-${i}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(i))
                        e.dataTransfer.effectAllowed = 'move'
                        setDragImage(i)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        if (dragOverImage !== i) setDragOverImage(i)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const from = Number(
                          e.dataTransfer.getData('text/plain'),
                        )
                        if (Number.isFinite(from)) moveImageTo(from, i)
                        setDragImage(null)
                        setDragOverImage(null)
                      }}
                      onDragEnd={() => {
                        setDragImage(null)
                        setDragOverImage(null)
                      }}
                      className={`relative cursor-grab overflow-hidden rounded-xl border-2 active:cursor-grabbing ${
                        img.isMain ? 'border-brand' : 'border-gray-200'
                      } ${dragOverImage === i ? 'ring-2 ring-brand' : ''} ${
                        dragImage === i ? 'opacity-50' : ''
                      }`}
                    >
                      <img
                        src={img.previewUrl}
                        alt=""
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <div className="flex flex-wrap gap-1 bg-white p-2 text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setImages((prev) =>
                              prev.map((im, j) => ({
                                ...im,
                                isMain: j === i,
                              })),
                            )
                          }
                          className={`rounded px-2 py-1 font-semibold ${
                            img.isMain
                              ? 'bg-brand text-white'
                              : 'bg-gray-100'
                          }`}
                        >
                          {img.isMain ? '★ প্রধান' : 'প্রধান করুন'}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(i, -1)}
                          disabled={i === 0}
                          className="rounded bg-gray-100 px-2 py-1 disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(i, 1)}
                          disabled={i === images.length - 1}
                          className="rounded bg-gray-100 px-2 py-1 disabled:opacity-40"
                        >
                          ↓
                        </button>
                        <label className="cursor-pointer rounded bg-gray-100 px-2 py-1 font-semibold">
                          বদলান
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              void replaceImage(
                                i,
                                e.target.files?.[0] ?? null,
                              )
                              e.target.value = ''
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="rounded bg-red-50 px-2 py-1 font-semibold text-red-600"
                        >
                          মুছুন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  এখনো ছবি যোগ করা হয়নি — ছবি ছাড়াও পেজ সেভ করা যাবে।
                </p>
              )}
            </StepCard>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 font-semibold"
              >
                ← আগের ধাপ
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-brand px-6 py-2.5 font-semibold text-white"
              >
                পরের ধাপ →
              </button>
            </div>
          </div>
          <div className="hidden xl:block">
            <BuilderSummary {...summaryProps} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0 space-y-5">
            <StepCard
              n={4}
              title="ভিডিও"
              subtitle="পণ্যের ভিডিও থাকলে লিংক দিন — ডেমো, টিউটোরিয়াল আলাদা করে"
            >
              {videos.length === 0 ? (
                <p className="text-sm text-gray-500">
                  এখনো ভিডিও যোগ করা হয়নি — ভিডিও ছাড়াও পেজ সেভ করা যাবে।
                </p>
              ) : null}
              <div className="space-y-3">
                {videos.map((v, i) => {
                  const invalid =
                    v.url.trim() !== '' && !youtubeEmbedId(v.url.trim())
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={v.url}
                          onChange={(e) => {
                            const url = e.target.value
                            setVideos((prev) =>
                              prev.map((item, j) =>
                                j === i ? { ...item, url } : item,
                              ),
                            )
                            if (url.trim() && !youtubeEmbedId(url.trim())) {
                              setVideoError(
                                'সঠিক YouTube লিংক দিন (youtube.com বা youtu.be) — অন্য লিংক পেজে দেখাবে না।',
                              )
                            } else if (videoError) {
                              setVideoError('')
                            }
                          }}
                          className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
                          placeholder="https://www.youtube.com/watch?v=…"
                          aria-label={`ভিডিও ${toBnDigits(i + 1)}-এর লিংক`}
                        />
                        <input
                          type="text"
                          value={v.label ?? ''}
                          onChange={(e) => {
                            const label = e.target.value
                            setVideos((prev) =>
                              prev.map((item, j) =>
                                j === i ? { ...item, label } : item,
                              ),
                            )
                          }}
                          className="w-28 shrink-0 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
                          placeholder="ডেমো / টিউটোরিয়াল"
                          aria-label="ভিডিওর লেবেল (ঐচ্ছিক)"
                        />
                      </div>
                      {invalid ? (
                        <p className="mt-2 text-sm font-medium text-red-600">
                          সঠিক YouTube লিংক দিন (youtube.com বা youtu.be) —
                          অন্য লিংক পেজে দেখাবে না।
                        </p>
                      ) : null}
                      <div className="mt-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setVideos((prev) =>
                              reorder(prev, i, i - 1),
                            )
                          }
                          disabled={i === 0}
                          className="rounded bg-white px-2 py-1 text-sm disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setVideos((prev) =>
                              reorder(prev, i, i + 1),
                            )
                          }
                          disabled={i === videos.length - 1}
                          className="rounded bg-white px-2 py-1 text-sm disabled:opacity-40"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setVideos((prev) =>
                              prev.filter((_, j) => j !== i),
                            )
                          }
                          className="rounded bg-red-50 px-2 py-1 text-sm font-semibold text-red-600"
                        >
                          মুছুন
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {videoError ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {videoError}
                </p>
              ) : null}
              {videos.length < MAX_VIDEOS ? (
                <button
                  type="button"
                  onClick={() =>
                    setVideos((prev) => [...prev, { url: '' }])
                  }
                  className="text-sm font-bold text-brand-dark"
                >
                  + আরেকটি ভিডিও
                </button>
              ) : (
                <p className="text-sm text-gray-500">
                  সর্বোচ্চ {toBnDigits(MAX_VIDEOS)}টি ভিডিও যোগ করা যাবে।
                </p>
              )}
              <span className={hintClass}>
                লিংক দিলে পেজে ভিডিও দেখানো হবে — একাধিক ভিডিও থাকলে
                কাস্টমার থাম্বনেইলে ক্লিক করে বদলাতে পারবে
              </span>
            </StepCard>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 font-semibold"
              >
                ← আগের ধাপ
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-brand px-6 py-2.5 font-semibold text-white"
              >
                পরের ধাপ →
              </button>
            </div>
          </div>
          <div className="hidden xl:block">
            <BuilderSummary {...summaryProps} />
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0 space-y-5">
            <StepCard
              n={5}
              title="কাস্টমার রিভিউ"
              subtitle="আসল কাস্টমারের রিভিউই শুধু যোগ করুন"
            >
              <div className="space-y-2">
                <input
                  type="text"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5"
                  placeholder="কাস্টমারের নাম"
                />
                <div className="flex gap-2">
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(e.target.value)}
                    className="rounded-2xl border border-gray-300 px-3 py-2.5"
                    aria-label="রেটিং"
                  >
                    <option value="">রেটিং (ঐচ্ছিক)</option>
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {toBnDigits(r)} তারা
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="min-w-0 flex-1 rounded-2xl border border-gray-300 px-4 py-2.5"
                    placeholder="রিভিউয়ের লেখা"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (reviewName.trim() && reviewText.trim()) {
                        setReviews((prev) => [
                          ...prev,
                          {
                            name: reviewName.trim(),
                            text: reviewText.trim(),
                            rating: reviewRating
                              ? Number(reviewRating)
                              : undefined,
                            ...(reviewPhotoFile
                              ? {
                                  photoFile: reviewPhotoFile,
                                  photoPreview: reviewPhotoPreview,
                                }
                              : {}),
                            ...(reviewScreenshotFile
                              ? {
                                  screenshotFile: reviewScreenshotFile,
                                  screenshotPreview:
                                    reviewScreenshotPreview,
                                }
                              : {}),
                          },
                        ])
                        setReviewName('')
                        setReviewText('')
                        setReviewRating('')
                        setReviewPhotoFile(null)
                        setReviewPhotoPreview('')
                        setReviewScreenshotFile(null)
                        setReviewScreenshotPreview('')
                      }
                    }}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
                  >
                    যোগ করুন
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm">
                    {reviewPhotoPreview ? (
                      <img
                        src={reviewPhotoPreview}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : null}
                    কাস্টমারের ছবি (ঐচ্ছিক)
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void pickReviewPhoto(e.target.files?.[0] ?? null)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm">
                    {reviewScreenshotPreview ? (
                      <img
                        src={reviewScreenshotPreview}
                        alt=""
                        className="h-8 w-12 rounded object-cover"
                      />
                    ) : null}
                    রিভিউর স্ক্রিনশট (ঐচ্ছিক)
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        pickReviewScreenshot(e.target.files?.[0] ?? null)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                <span className={hintClass}>
                  ছবি ৪:৩-এ কেটে নেওয়া হবে; স্ক্রিনশট আসল আকারেই থাকবে
                </span>
              </div>
              <ul className="space-y-1">
                {reviews.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {r.photoPreview || r.photo_url ? (
                        <img
                          src={r.photoPreview ?? r.photo_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : null}
                      <span className="min-w-0">
                        {r.name}
                        {r.rating ? ` — ${toBnDigits(r.rating)} তারা` : ''}:{' '}
                        {r.text}
                        {r.screenshotPreview || r.screenshot_url ? (
                          <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
                            📷 স্ক্রিনশট
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReviews((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-red-600"
                      aria-label="মুছুন"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </StepCard>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 font-semibold"
              >
                ← আগের ধাপ
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-brand px-6 py-2.5 font-semibold text-white"
              >
                পরের ধাপ →
              </button>
            </div>
          </div>
          <div className="hidden xl:block">
            <BuilderSummary {...summaryProps} />
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0 space-y-5">
            <StepCard n={6} title="জিজ্ঞাসা" subtitle="কাস্টমারের সাধারণ প্রশ্ন ও উত্তর">
              <div className="space-y-2">
                <input
                  type="text"
                  value={faqQ}
                  onChange={(e) => setFaqQ(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5"
                  placeholder="প্রশ্ন"
                />
                <input
                  type="text"
                  value={faqA}
                  onChange={(e) => setFaqA(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5"
                  placeholder="উত্তর"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (faqQ.trim() && faqA.trim()) {
                      setFaqs((prev) => [
                        ...prev,
                        { q: faqQ.trim(), a: faqA.trim() },
                      ])
                      setFaqQ('')
                      setFaqA('')
                    }
                  }}
                  className="text-sm font-bold text-brand-dark"
                >
                  + আরেকটি প্রশ্ন
                </button>
              </div>
              <ul className="space-y-1">
                {faqs.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span>
                      {f.q} — {f.a}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFaqs((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-red-600"
                      aria-label="মুছুন"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <label className="block">
                <span className={labelClass}>ডেলিভারি তথ্য</span>
                <textarea
                  rows={3}
                  value={deliveryInfo}
                  onChange={(e) => setDeliveryInfo(e.target.value)}
                  className={inputClass}
                  placeholder="যেমন: সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।"
                />
                <span className={hintClass}>
                  ডেলিভারি সেকশনে দেখানো হবে — যেমন ডেলিভারির সময় বা শর্ত
                </span>
              </label>
            </StepCard>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(5)}
                className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 font-semibold"
              >
                ← আগের ধাপ
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-brand px-6 py-2.5 font-semibold text-white"
              >
                পরের ধাপ →
              </button>
            </div>
          </div>
          <div className="hidden xl:block">
            <BuilderSummary {...summaryProps} />
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
            <div className="min-w-0 space-y-5">
              <StepCard
                n={7}
                title="প্রিভিউ ও পাবলিশ"
                subtitle="ডানদিকে লাইভ প্রিভিউ দেখে নিন — মোবাইলে উপরের প্রিভিউ বোতামে"
              >
                <label className="block">
                  <span className={labelClass}>লিংকের নাম</span>
                  <div className="mt-1 flex overflow-hidden rounded-2xl border border-gray-300">
                    <span className="flex items-center bg-gray-100 px-3 text-sm text-gray-600">
                      {typeof window !== 'undefined'
                        ? window.location.origin.replace(/^https?:\/\//, '')
                        : 'orderlinkbd.netlify.app'}
                      /{shop.slug}/
                    </span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true)
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ''),
                        )
                      }}
                      className="min-w-0 flex-1 px-3 py-2.5 text-sm"
                      placeholder="premium-leather-wallet"
                    />
                  </div>
                  <span className={hintClass}>
                    লিংক বদলালে ফেসবুক পোস্টে দেওয়া পুরনো লিংক আর কাজ করবে না
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 accent-[#006a4e]"
                  />
                  <span>
                    <span className={`block ${labelClass}`}>
                      পেজ পাবলিশ করুন
                    </span>
                    <span className={hintClass}>
                      পাবলিশ হলেই কাস্টমার এই পেজ থেকে অর্ডার করতে পারবে
                    </span>
                  </span>
                </label>
              </StepCard>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(6)}
                  className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 font-semibold"
                >
                  ← আগের ধাপ
                </button>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave(isPublished)}
                className="w-full rounded-2xl bg-gradient-to-b from-[#0a7a5c] to-[#006a4e] px-6 py-3.5 text-lg font-bold text-white shadow-sm disabled:opacity-50"
              >
                {busy ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
              </button>
            </div>
            <div className="min-w-0 xl:sticky xl:top-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-gray-900">লাইভ প্রিভিউ</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      কাস্টমার ঠিক এভাবেই পেজটা দেখবে।
                    </p>
                  </div>
                  <div
                    className="flex overflow-hidden rounded-xl border border-gray-300 text-sm font-semibold"
                    role="group"
                    aria-label="প্রিভিউয়ের ডিভাইস"
                  >
                    {(
                      [
                        { id: 'desktop', label: 'ডেস্কটপ' },
                        { id: 'tablet', label: 'ট্যাবলেট' },
                        { id: 'mobile', label: 'মোবাইল' },
                      ] as const
                    ).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setPreviewDevice(d.id)}
                        className={`px-3 py-2 ${
                          previewDevice === d.id
                            ? 'bg-brand text-white'
                            : 'bg-white text-gray-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className={
                    previewDevice === 'desktop'
                      ? ''
                      : 'mx-auto w-full ' +
                        (previewDevice === 'tablet'
                          ? 'max-w-[768px]'
                          : 'max-w-[390px]')
                  }
                >
                  {previewDevice !== 'desktop' ? (
                    <p className="mt-2 text-center text-xs font-semibold text-gray-500">
                      {previewDevice === 'tablet'
                        ? '৭৬৮px — ট্যাবলেট'
                        : '৩৯০px — মোবাইল'}
                    </p>
                  ) : null}
                  <div className="mt-2 overflow-hidden rounded-2xl border-2 border-gray-300 xl:max-h-[calc(100vh-160px)] xl:overflow-y-auto">
                    {previewData ? (
                      <CustomerPage data={previewData} preview />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SellerShell>
  )
}
