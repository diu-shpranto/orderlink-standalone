// ল্যান্ডিং পেজ বিল্ডার — ৭ ধাপ (লাইভ অ্যাপের মতো): টেমপ্লেট → পণ্যের
// তথ্য → ছবি → ভিডিও → কাস্টমার রিভিউ → জিজ্ঞাসা → প্রিভিউ ও পাবলিশ।
// ছাড়ের % অটো-হিসাব (পুরনো দাম থেকে)। ছবি সর্বোচ্চ ৮টি, Storage-এ
// আপলোড হয় সেভের সময়। পেজের ভাষা বানানোর সময় বাছাই হয়।
// লাইভ প্রিভিউ আসল কাস্টমার পেজের কম্পোনেন্ট দিয়েই দেখায়।
import { useEffect, useState } from 'react'
import CustomerPage from '../components/CustomerPage.tsx'
import SellerShell from '../components/SellerShell.tsx'
import { useAuth } from '../lib/auth.tsx'
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
  ReviewItem,
  ShopRow,
  TemplateId,
} from '../lib/types.ts'

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

/** টেমপ্লেট কার্ডের ছোট বিমূর্ত প্রিভিউ — টেমপ্লেটের নিজের রঙে। */
function TemplateThumb({ t }: { t: TemplateMeta }) {
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
  const [videoUrl, setVideoUrl] = useState('')

  // ধাপ ৫-৬ — রিভিউ ও জিজ্ঞাসা
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [reviewName, setReviewName] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState('')
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

  useEffect(() => {
    if (!seller) return
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const shopRow = await fetchSellerShop(seller.id)
        if (!mounted) return
        setShop(shopRow)
        if (productId) {
          const existing = await fetchProductForEdit(productId, seller.id)
          if (!mounted || !existing) return
          const p = existing.product
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
            setSectionOrder(existing.page.section_order)
            setVideoUrl(existing.page.video_url ?? '')
            setReviews(existing.page.reviews)
            setFaqs(existing.page.faqs)
            setDeliveryInfo(existing.page.delivery_info ?? '')
            setPageLang(existing.page.page_lang)
            setIsPublished(existing.page.is_published)
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
    if (!seller || !shop) {
      setError('দোকানের তথ্য পাওয়া যায়নি — আবার লগইন করুন।')
      return
    }
    setBusy(true)
    try {
      // নতুন ছবির মোট সাইজ স্টোরেজের সীমার মধ্যে আছে কি — সীমা
      // ছাড়ালে আপলোডের আগেই বাংলায় ভুল দেখাবে।
      const newBytes = images.reduce(
        (sum, img) => sum + (img.file ? img.file.size : 0),
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
          videoUrl: videoUrl.trim(),
          reviews,
          faqs,
          ...(withNewFields ? { deliveryInfo } : {}),
          pageLang,
          isPublished: publish,
        },
      })
      let saved: { productId: string; pageId: string }
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
      // ব্যবহারের হিসাব তাজা করা (স্টোরেজের পরিমাণ) — ব্যর্থ হলেও
      // সেভ আটকাবে না।
      void fetchUsage(seller.id).catch(() => undefined)
      setSavedProductId(savedId)
      setPageId(savedPageId)
      setIsPublished(publish)
      setNotice(
        (publish
          ? 'পেজটি প্রকাশ করা হয়েছে।'
          : 'সেভ হয়েছে — খসড়া হিসেবে আছে, প্রকাশ করলে লিংকটা কাজ করবে।') +
          (newFieldsDropped
            ? ' তবে ছোট বিবরণ, ক্যাটাগরি ও ডেলিভারি তথ্য সেভ হয়নি — ডাটাবেস আপডেট বাকি আছে।'
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
            video_url: videoUrl.trim() || null,
            reviews,
            faqs,
            delivery_info: deliveryInfo.trim() || null,
            page_lang: pageLang,
            is_published: isPublished,
            is_suspended: false,
          },
          sellerWhatsapp: seller.whatsapp,
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
    hasVideo: videoUrl.trim() !== '',
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
              <ul className="mt-3 space-y-2">
                {sectionOrder.map((sectionId, i) => {
                  const def = SECTION_DEFS.find((d) => d.id === sectionId)
                  if (!def) return null
                  return (
                    <li
                      key={sectionId}
                      className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <label className="flex items-center gap-2 text-sm font-medium">
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
              <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-600">
                ছবি বাছুন (একসাথে একাধিক)
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
                      className={`relative overflow-hidden rounded-xl border-2 ${
                        img.isMain ? 'border-brand' : 'border-gray-200'
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
            <StepCard n={4} title="ভিডিও" subtitle="পণ্যের ভিডিও থাকলে লিংক দিন">
              <label className="block">
                <span className={labelClass}>YouTube ভিডিওর লিংক (যদি থাকে)</span>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://www.youtube.com/watch?v=…"
                />
                <span className={hintClass}>
                  লিংক দিলে পেজে ভিডিও দেখানো হবে
                </span>
              </label>
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
                          },
                        ])
                        setReviewName('')
                        setReviewText('')
                        setReviewRating('')
                      }
                    }}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
                  >
                    যোগ করুন
                  </button>
                </div>
              </div>
              <ul className="space-y-1">
                {reviews.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span>
                      {r.name}
                      {r.rating ? ` — ${toBnDigits(r.rating)} তারা` : ''}:{' '}
                      {r.text}
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
                <h2 className="font-bold text-gray-900">লাইভ প্রিভিউ</h2>
                <p className="mt-1 text-sm text-gray-500">
                  কাস্টমার ঠিক এভাবেই পেজটা দেখবে।
                </p>
                <div className="mt-3 overflow-hidden rounded-2xl border-2 border-gray-300 xl:max-h-[calc(100vh-160px)] xl:overflow-y-auto">
                  {previewData ? (
                    <CustomerPage data={previewData} preview />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SellerShell>
  )
}
