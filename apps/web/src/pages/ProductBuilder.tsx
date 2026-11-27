// প্রোডাক্ট বিল্ডার — ৩ ধাপ: তথ্য → ছবি ও মিডিয়া → ডিজাইন ও প্রিভিউ।
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
  fetchProductForEdit,
  fetchSellerShop,
  MAX_IMAGES_PER_PRODUCT,
  saveProductAndPage,
  syncProductImages,
  uploadProductImage,
} from '../lib/products.ts'
import { navigate } from '../lib/router.ts'
import {
  DEFAULT_SECTION_ORDER,
  DEFAULT_SECTIONS,
  SECTION_DEFS,
  TEMPLATES,
} from '../lib/templates.ts'
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

const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2'

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

  // ধাপ ১ — পণ্যের তথ্য
  const [name, setName] = useState('')
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

  // ধাপ ২ — ছবি ও মিডিয়া
  const [images, setImages] = useState<ImageItem[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [reviewName, setReviewName] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState('')
  const [faqs, setFaqs] = useState<FaqItem[]>([])
  const [faqQ, setFaqQ] = useState('')
  const [faqA, setFaqA] = useState('')

  // ধাপ ৩ — ডিজাইন
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

  function validateStep1(): string {
    if (!name.trim()) return 'পণ্যের নাম দিন।'
    if (!Number.isFinite(priceNum) || priceNum <= 0)
      return 'সঠিক দাম দিন (০-এর বেশি)।'
    if (
      oldPriceStr.trim() !== '' &&
      (!Number.isFinite(oldPriceNum) || (oldPriceNum ?? 0) < 0)
    ) {
      return 'পুরনো দামে সঠিক সংখ্যা দিন।'
    }
    if (!SLUG_PATTERN.test(slug)) {
      return 'লিংকের নামে শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন (-) চলবে।'
    }
    return ''
  }

  function addFiles(files: FileList | null) {
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
    setImages((prev) => [
      ...prev,
      ...picked.map((file, i) => ({
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
    const validationError = validateStep1()
    if (validationError) {
      setError(validationError)
      setStep(1)
      return
    }
    if (!seller || !shop) {
      setError('দোকানের তথ্য পাওয়া যায়নি — আবার লগইন করুন।')
      return
    }
    setBusy(true)
    try {
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
      const { productId: savedId, pageId: savedPageId } =
        await saveProductAndPage({
          sellerId: seller.id,
          shopId: shop.id,
          productId: savedProductId,
          product: {
            name: name.trim(),
            price: priceNum,
            oldPrice: oldPriceNum,
            description: description.trim(),
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
            pageLang,
            isPublished: publish,
          },
        })
      await syncProductImages(savedId, seller.id, resolved)
      setSavedProductId(savedId)
      setPageId(savedPageId)
      setIsPublished(publish)
      setNotice(
        publish
          ? 'পেজটি প্রকাশ করা হয়েছে।'
          : 'সেভ হয়েছে — খসড়া হিসেবে আছে, প্রকাশ করলে লিংকটা কাজ করবে।',
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
            page_lang: pageLang,
            is_published: isPublished,
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

  return (
    <SellerShell active="products">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          {savedProductId ? 'প্রোডাক্ট এডিট করুন' : 'নতুন প্রোডাক্ট'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/dashboard/products')}
          className="text-sm font-semibold text-brand-dark underline"
        >
          ← তালিকায় ফিরুন
        </button>
      </div>

      <ol className="mt-4 flex gap-2 text-sm">
        {['তথ্য', 'ছবি ও মিডিয়া', 'ডিজাইন ও প্রিভিউ'].map((label, i) => (
          <li key={label} className="flex-1">
            <button
              type="button"
              onClick={() => setStep(i + 1)}
              className={`w-full rounded-lg border px-3 py-2 font-semibold ${
                step === i + 1
                  ? 'border-brand bg-brand-light text-brand-dark'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              {toBnDigits(i + 1)}. {label}
            </button>
          </li>
        ))}
      </ol>

      {error ? (
        <p className="mt-4 rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-4 rounded bg-brand-light px-4 py-3 text-sm text-brand-dark">
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
        <div className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              পণ্যের নাম *
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={inputClass}
              placeholder="যেমন: প্রিমিয়াম লেদার ওয়ালেট"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">
                দাম (৳) *
              </span>
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
              <span className="text-sm font-semibold text-gray-700">
                পুরনো দাম (৳) — থাকলে ছাড় অটো হিসাব হবে
              </span>
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
            <p className="rounded bg-red-50 px-3 py-2 text-sm font-semibold text-accent">
              {toBnDigits(discount)}% ছাড় দেখাবে ({formatBDT(priceNum)} — আগে{' '}
              {formatBDT(oldPriceNum ?? 0)})
            </p>
          ) : null}
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">বিবরণ</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              placeholder="পণ্যটা সম্পর্কে সংক্ষেপে লিখুন"
            />
          </label>
          <div>
            <span className="text-sm font-semibold text-gray-700">সুবিধা</span>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                className="flex-1 rounded border border-gray-300 px-3 py-2"
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
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
              >
                যোগ করুন
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {benefits.map((b, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
                >
                  {b}
                  <button
                    type="button"
                    onClick={() =>
                      setBenefits((prev) => prev.filter((_, j) => j !== i))
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
            <span className="text-sm font-semibold text-gray-700">
              স্পেসিফিকেশন
            </span>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
                className="flex-1 rounded border border-gray-300 px-3 py-2"
                placeholder="যেমন: উপাদান"
              />
              <input
                type="text"
                value={specValue}
                onChange={(e) => setSpecValue(e.target.value)}
                className="flex-1 rounded border border-gray-300 px-3 py-2"
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
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
              >
                যোগ করুন
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {specs.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
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
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              পেজের লিংকের নাম *
            </span>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                )
              }}
              className={inputClass}
              placeholder="premium-leather-wallet"
            />
            <span className="mt-1 block text-sm text-gray-500">
              পেজের ঠিকানা হবে: /{shop.slug}/{slug || '…'}
            </span>
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                const err = validateStep1()
                if (err) {
                  setError(err)
                  return
                }
                setError('')
                setStep(2)
              }}
              className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-white"
            >
              পরের ধাপ →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div>
            <span className="text-sm font-semibold text-gray-700">
              ছবির গ্যালারি (সর্বোচ্চ {toBnDigits(MAX_IMAGES_PER_PRODUCT)}টি)
            </span>
            <label className="mt-2 block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-600">
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
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              <p className="mt-2 text-sm text-gray-500">
                এখনো ছবি যোগ করা হয়নি — ছবি ছাড়াও পেজ সেভ করা যাবে।
              </p>
            )}
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              YouTube ভিডিওর লিংক (যদি থাকে)
            </span>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className={inputClass}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </label>
          <div>
            <span className="text-sm font-semibold text-gray-700">
              রিভিউ (আসল কাস্টমারের রিভিউই শুধু)
            </span>
            <div className="mt-1 space-y-2">
              <input
                type="text"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
                placeholder="কাস্টমারের নাম"
              />
              <div className="flex gap-2">
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2"
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
                  className="flex-1 rounded border border-gray-300 px-3 py-2"
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
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
                >
                  যোগ করুন
                </button>
              </div>
            </div>
            <ul className="mt-2 space-y-1">
              {reviews.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
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
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-700">জিজ্ঞাসা (FAQ)</span>
            <div className="mt-1 space-y-2">
              <input
                type="text"
                value={faqQ}
                onChange={(e) => setFaqQ(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
                placeholder="প্রশ্ন"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={faqA}
                  onChange={(e) => setFaqA(e.target.value)}
                  className="flex-1 rounded border border-gray-300 px-3 py-2"
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
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
                >
                  যোগ করুন
                </button>
              </div>
            </div>
            <ul className="mt-2 space-y-1">
              {faqs.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
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
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-gray-300 px-6 py-2.5 font-semibold"
            >
              ← আগের ধাপ
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-white"
            >
              পরের ধাপ →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold">টেমপ্লেট বাছুন</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-xl border-2 p-4 text-left ${
                    template === t.id
                      ? 'border-brand bg-brand-light'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="block font-bold">{t.nameBn}</span>
                  <span className="mt-1 block text-xs text-gray-600">
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
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold">সেকশন চালু/বন্ধ ও ক্রম</h2>
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

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold">পেজের ভাষা</h2>
            <p className="mt-1 text-sm text-gray-500">
              কাস্টমার পেজে ভাষা বদলের বোতাম থাকবে না — এখানেই ঠিক হয়।
            </p>
            <div className="mt-3 flex gap-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="page-lang"
                  checked={pageLang === 'bn'}
                  onChange={() => setPageLang('bn')}
                />
                বাংলা
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="page-lang"
                  checked={pageLang === 'en'}
                  onChange={() => setPageLang('en')}
                />
                English
              </label>
            </div>
          </div>

          <div>
            <h2 className="font-bold">লাইভ প্রিভিউ</h2>
            <p className="mt-1 text-sm text-gray-500">
              কাস্টমার ঠিক এভাবেই পেজটা দেখবে।
            </p>
            <div className="mt-3 overflow-hidden rounded-2xl border-2 border-gray-300">
              {previewData ? <CustomerPage data={previewData} /> : null}
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-semibold"
            >
              ← আগের ধাপ
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave(false)}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-semibold disabled:opacity-50"
              >
                {busy ? 'সেভ হচ্ছে…' : 'খসড়া হিসেবে সেভ করুন'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave(true)}
                className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? 'প্রকাশ হচ্ছে…'
                  : isPublished
                    ? 'আপডেট ও প্রকাশিত রাখুন'
                    : 'প্রকাশ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SellerShell>
  )
}
