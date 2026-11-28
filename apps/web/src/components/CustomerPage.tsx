// কাস্টমার পেজ — পণ্যের পাবলিক ল্যান্ডিং পেজ, বেছে নেওয়া টেমপ্লেটে রেন্ডার।
// একই কম্পোনেন্ট লাইভ পেজ ও বিল্ডারের লাইভ প্রিভিউ — দুই জায়গায় চলে।
// নিয়ম: ভুয়া রিভিউ/রেটিং/ছাড় নেই — শুধু আসল সেভ করা ডাটা; রিভিউ না
// থাকলে রেটিং দেখানো হয় না। ডেলিভারি চার্জ শুধু দোকানের সেটিংস থেকে।
// ভেরিয়েন্ট নেই। স্টিকি মোবাইল অর্ডার বার শুধু Aura/Nova/Social Proof-এ
// (শেয়ার করা বার); Luxury/Fashion/Tech/Beauty/BD/Lavender/Emerald/
// Midnight/Sunset-এর নিজের বার।
// ছবি সব টেমপ্লেটে একই ৪:৩ ফরম্যাটে ফ্রেম ভরে দেখায় (object-cover);
// ছবিতে ক্লিক করলে লাইটবক্সে আসল সাইজের (ক্রপ না-করা) ছবি দেখায়।
// ছাড়ের % অটো-হিসাব।
// অর্ডার ফর্ম আসল — জমা হলে ধন্যবাদ পেজ দেখায় (অর্ডার নম্বরসহ)।
import { useEffect, useRef, useState } from 'react'
import FramedPhoto from './FramedPhoto.tsx'
import OrderForm from './OrderForm.tsx'
import type { PlacedOrder } from './OrderForm.tsx'
import { customerStrings } from '../lib/i18n.ts'
import {
  discountPercent,
  formatBDT,
  toBnDigits,
} from '../lib/pricing.ts'
import { templateById } from '../lib/templates.ts'
import type {
  CustomerPageData,
  PageRow,
  ProductImageRow,
  VideoItem,
} from '../lib/types.ts'
import type { CustomerStrings as StringsType } from '../lib/i18n.ts'

/**
 * সোয়াইপ হ্যান্ডলার — বামে সোয়াইপে পরের ছবি, ডানে সোয়াইপে আগের ছবি।
 * ট্যাপ (ছোট নড়াচড়া) সোয়াইপ নয় — ট্যাপের ক্লিক ঠিকঠাক কাজ করে।
 * সোয়াইপের পর ব্রাউজার ক্লিকও পাঠায় — সেটা চাপা দেওয়া হয়, নইলে
 * সোয়াইপ করলেই লাইটবক্স খুলে/বন্ধ হয়ে যেত (onClick-এ
 * suppressClickIfSwiped ডাকতে হয়)। ফ্ল্যাগ ৩৫০ মি.সে. পরে নিজে
 * থেকে মুছে যায়, যাতে আটকে না থাকে।
 */
function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]
      start.current = { x: t.clientX, y: t.clientY }
      swiped.current = false
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (!start.current) return
      const t = e.touches[0]
      if (Math.abs(t.clientX - start.current.x) > 30) {
        swiped.current = true
      }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!start.current) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.current.x
      const dy = t.clientY - start.current.y
      start.current = null
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) onLeft()
        else onRight()
      }
      if (swiped.current) {
        window.setTimeout(() => {
          swiped.current = false
        }, 350)
      }
    },
    suppressClickIfSwiped: () => {
      if (swiped.current) {
        swiped.current = false
        return true
      }
      return false
    },
  }
}

export function youtubeEmbedId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/,
  )
  return m ? m[1] : null
}

/**
 * পেজের ভিডিওর তালিকা — নতুন video_urls আগে, না থাকলে পুরনো এক
 * ভিডিও (video_url) ফলব্যাক। খালি লিংক বাদ যায়।
 */
function pageVideos(page: PageRow): VideoItem[] {
  const list = (page.video_urls ?? []).filter(
    (v) => v && typeof v.url === 'string' && v.url.trim() !== '',
  )
  if (list.length > 0) {
    return list.map((v) => ({
      url: v.url.trim(),
      label: v.label?.trim() ? v.label.trim() : undefined,
    }))
  }
  return page.video_url?.trim() ? [{ url: page.video_url.trim() }] : []
}

/**
 * একাধিক ভিডিওর প্লেয়ার — মূল ভিডিও + নিচে থাম্বনেইলের তালিকা
 * (থাম্বনেইলে ক্লিক করলে ভিডিও বদলায়)। একটাই ভিডিও থাকলে
 * থাম্বনেইল দেখায় না; চালানোর মতো ভিডিও না থাকলে কিছু দেখায় না।
 * YouTube-এর বাইরের লিংক বাদ যায় (বিল্ডারে আগেই যাচাই হয়)।
 */
function VideoPlayer({
  videos,
  productName,
  frameClass,
  thumbActiveClass = 'border-brand',
}: {
  videos: VideoItem[]
  productName: string
  frameClass: string
  thumbActiveClass?: string
}) {
  const playable = videos
    .map((v) => ({ ...v, id: youtubeEmbedId(v.url) }))
    .filter(
      (v): v is VideoItem & { id: string } => v.id !== null,
    )
  const [active, setActive] = useState(0)
  if (playable.length === 0) return null
  const current = playable[Math.min(active, playable.length - 1)]
  return (
    <div>
      <div className={frameClass}>
        <iframe
          src={`https://www.youtube.com/embed/${current.id}`}
          title={
            current.label
              ? `${productName} — ${current.label}`
              : productName
          }
          className="h-full w-full"
          allowFullScreen
        />
      </div>
      {playable.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {playable.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`relative w-32 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === active ? thumbActiveClass : 'border-transparent'
              }`}
              aria-label={v.label ?? `ভিডিও ${toBnDigits(i + 1)}`}
            >
              <img
                src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                alt=""
                className="aspect-video w-full object-cover"
              />
              {v.label ? (
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {v.label}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** রিভিউর কাস্টমারের ছবি — ছবি থাকলে সেটা, না থাকলে নামের অক্ষর। */
function ReviewAvatar({
  photoUrl,
  name,
}: {
  photoUrl?: string
  name: string
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-base font-extrabold text-brand-dark"
      aria-hidden="true"
    >
      {name.charAt(0)}
    </span>
  )
}

/**
 * রিভিউর স্ক্রিনশট — ছোট থাম্বনেইল; ক্লিক করলে আসল আকারে
 * (ক্রপ না-করা) ফুলস্ক্রিনে দেখায়। বন্ধ: ✕, পেছনে ক্লিক, বা Esc।
 */
function ReviewScreenshot({ url, alt }: { url: string; alt: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 block overflow-hidden rounded-lg border border-gray-200"
        aria-label="স্ক্রিনশট বড় করে দেখুন"
      >
        <img src={url} alt={alt} className="max-h-36 w-auto" />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="বন্ধ করুন"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl font-bold leading-none text-white hover:bg-white/30"
          >
            ×
          </button>
          <img
            src={url}
            alt={alt}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  )
}

/**
 * ছবির লাইটবক্স — আসল সাইজের (ক্রপ না-করা) ছবি পর্দা জুড়ে দেখায়।
 * হিরোতে ছবি ৪:৩-এ কেটে দেখালেও এখানে পুরো আসল ছবি দেখা যায়।
 * বন্ধ: ✕ বোতাম, পেছনে ক্লিক, বা Esc। একাধিক ছবি থাকলে
 * তীর/সোয়াইপ-কি দিয়ে আগের-পরের ছবি দেখা যায়।
 */
function Lightbox({
  images,
  index,
  productName,
  onClose,
  onNavigate,
}: {
  images: ProductImageRow[]
  index: number
  productName: string
  onClose: () => void
  onNavigate: (i: number) => void
}) {
  const current = images[index]
  const { suppressClickIfSwiped, ...lightboxTouch } = useSwipe(
    () => onNavigate((index + 1) % images.length),
    () => onNavigate((index - 1 + images.length) % images.length),
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (images.length > 1) {
        if (e.key === 'ArrowLeft')
          onNavigate((index - 1 + images.length) % images.length)
        if (e.key === 'ArrowRight') onNavigate((index + 1) % images.length)
      }
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, images.length, onClose, onNavigate])
  if (!current) return null
  const prev = () => onNavigate((index - 1 + images.length) % images.length)
  const next = () => onNavigate((index + 1) % images.length)
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={productName}
      onClick={() => {
        if (suppressClickIfSwiped()) return
        onClose()
      }}
      {...lightboxTouch}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="বন্ধ করুন"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl font-bold leading-none text-white hover:bg-white/30"
      >
        ×
      </button>
      {images.length > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            aria-label="আগের ছবি"
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl font-bold leading-none text-white hover:bg-white/30 sm:left-4"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            aria-label="পরের ছবি"
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl font-bold leading-none text-white hover:bg-white/30 sm:right-4"
          >
            ›
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white">
            {toBnDigits(index + 1)} / {toBnDigits(images.length)}
          </p>
        </>
      ) : null}
      <img
        src={current.url}
        alt={productName}
        className="max-h-[90vh] max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

function Gallery({
  images,
  productName,
  thumbActiveClass = 'border-brand',
}: {
  images: ProductImageRow[]
  productName: string
  /** বাছাই করা থাম্বনেইলের বর্ডারের রং (ডিফল্ট ব্র্যান্ড সবুজ)। */
  thumbActiveClass?: string
}) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const { suppressClickIfSwiped, ...galleryTouch } = useSwipe(
    () => setActive((a) => (a + 1) % images.length),
    () => setActive((a) => (a - 1 + images.length) % images.length),
  )
  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-gray-100 text-gray-400">
        ছবি যোগ করা হয়নি
      </div>
    )
  }
  const current = images[Math.min(active, images.length - 1)]
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="ছবি বড় করে দেখুন"
        onClick={() => {
          if (suppressClickIfSwiped()) return
          setLightbox(active)
        }}
        {...galleryTouch}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setLightbox(active)
          }
        }}
        className="relative cursor-zoom-in touch-pan-y"
      >
        <FramedPhoto src={current.url} alt={productName} />
        <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
          বড় করুন
        </span>
      </div>
      {images.length > 1 ? (
        <div className="mt-2 flex snap-x gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={`aspect-[4/3] h-16 shrink-0 snap-start overflow-hidden rounded border-2 ${
                i === active ? thumbActiveClass : 'border-transparent'
              }`}
              aria-label={`ছবি ${toBnDigits(i + 1)}`}
            >
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
      {lightbox !== null ? (
        <Lightbox
          images={images}
          index={lightbox}
          productName={productName}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
        />
      ) : null}
    </div>
  )
}

function PriceRow({
  data,
  dark,
}: {
  data: CustomerPageData
  dark: boolean
}) {
  const { product } = data
  const discount = discountPercent(product.price, product.old_price)
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span
        className={`text-3xl font-extrabold ${dark ? 'text-white' : 'text-gray-900'}`}
      >
        {formatBDT(product.price)}
      </span>
      {product.old_price && product.old_price > product.price ? (
        <>
          <span className="text-lg text-gray-400 line-through">
            {formatBDT(product.old_price)}
          </span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
            {toBnDigits(discount)}% ছাড়
          </span>
        </>
      ) : null}
    </div>
  )
}

function RatingSummary({
  data,
  t,
}: {
  data: CustomerPageData
  t: StringsType
}) {
  const rated = data.page.reviews.filter(
    (r) => typeof r.rating === 'number' && r.rating > 0,
  )
  if (rated.length === 0) return null
  const avg =
    rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length
  const rounded = Math.round(avg * 10) / 10
  return (
    <p className="text-sm text-gray-600">
      <span className="font-bold text-amber-500">
        {'★'.repeat(Math.round(avg))}
      </span>{' '}
      {toBnDigits(String(rounded))} · {t.basedOnReviews(rated.length)}
    </p>
  )
}

function OrderSection({
  data,
  t,
  placed,
  preview,
  onPlaced,
  onOrderAgain,
  dark = false,
  accent = '#D6B36A',
  accentText = '#0B0B0D',
  lightAccent,
}: {
  data: CustomerPageData
  t: StringsType
  placed: PlacedOrder | null
  preview: boolean
  onPlaced: (placed: PlacedOrder) => void
  onOrderAgain: () => void
  /** Luxury Premium টেমপ্লেটের গাঢ় সোনালি রূপ — অন্য টেমপ্লেটে বদলায় না। */
  dark?: boolean
  /** গাঢ় রূপে ✓ ও লিংকের রং (ডিফল্ট সোনালি) — ফর্মেও পাঠানো হয়। */
  accent?: string
  accentText?: string
  /** হালকা থিমে ফর্মের CTA-র রং (শুধু Beauty টেমপ্লেট দেয়)। */
  lightAccent?: string
}) {
  const { shop, sellerWhatsapp, product } = data
  if (placed) {
    const waText = encodeURIComponent(
      `আমার অর্ডার ${placed.orderCode} — "${product.name}"।`,
    )
    return (
      <section
        id="order"
        className={`rounded-2xl border p-5 text-center ${
          dark ? 'border-[#34343A] bg-[#1D1D21]' : 'border-gray-200 bg-white'
        }`}
      >
        <p className="text-4xl" style={{ color: accent }}>
          ✓
        </p>
        <h2
          className={`mt-2 text-xl font-extrabold ${
            dark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {t.orderPlaced}
        </h2>
        <p
          className={`mt-2 text-sm leading-relaxed ${
            dark ? 'text-[#B8B8B8]' : 'text-gray-600'
          }`}
        >
          {t.orderReceived}
        </p>
        <div
          className={`mx-auto mt-4 max-w-sm space-y-1 rounded-xl px-4 py-3 text-left text-sm ${
            dark
              ? 'border border-[#34343A] bg-[#151518] text-white'
              : 'bg-gray-50'
          }`}
        >
          <p className="flex justify-between">
            <span className={dark ? 'text-[#B8B8B8]' : 'text-gray-600'}>
              {t.orderNumber}
            </span>
            <span className="font-bold">{placed.orderCode}</span>
          </p>
          <p className="flex justify-between">
            <span className={dark ? 'text-[#B8B8B8]' : 'text-gray-600'}>
              {product.name}
            </span>
            <span className="font-semibold">
              × {toBnDigits(placed.quantity)}
            </span>
          </p>
          <p
            className={`flex justify-between border-t pt-2 font-extrabold ${
              dark ? 'border-[#34343A]' : 'border-gray-200'
            }`}
          >
            <span>{t.total}</span>
            <span>{formatBDT(placed.total)}</span>
          </p>
        </div>
        {sellerWhatsapp ? (
          <a
            href={`https://wa.me/${sellerWhatsapp}?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block rounded-lg bg-brand px-4 py-3 font-semibold text-white"
          >
            {t.whatsappSeller}
          </a>
        ) : null}
        <button
          type="button"
          onClick={onOrderAgain}
          className={`mt-3 text-sm font-semibold underline ${
            dark ? '' : lightAccent ? '' : 'text-brand-dark'
          }`}
          style={
            dark
              ? { color: accent }
              : lightAccent
                ? { color: lightAccent }
                : undefined
          }
        >
          {t.orderAgain}
        </button>
      </section>
    )
  }
  // ডেস্কটপে (lg+) অর্ডার সেকশন দুই কলাম — ফর্ম বামে, পণ্যের সারসংক্ষেপ
  // + আস্থার লাইন ডানে। মোবাইলে আগের মতো এক কলাম (পাশের প্যানেল লুকানো)।
  const orderSavings =
    product.old_price && product.old_price > product.price
      ? product.old_price - product.price
      : 0
  const orderDiscount = discountPercent(
    Number(product.price),
    product.old_price,
  )
  const orderFirstImage = data.images.length > 0 ? data.images[0] : null
  return (
    <section
      id="order"
      className={`overflow-hidden rounded-2xl border p-5 shadow-sm lg:p-8 ${
        dark ? 'border-[#34343A] bg-[#1D1D21]' : 'border-gray-200 bg-white'
      }`}
    >
      {/* ফর্মের রঙিন হেডার স্ট্রিপ — পণ্যের নাম ও দামসহ, যাতে নতুন ফর্ম
          এক নজরে চোখে পড়ে। গাঢ় থিমে সোনালি, Beauty-তে গোলাপি। */}
      <div
        className={`-m-5 mb-5 flex items-center justify-between gap-3 px-5 py-4 lg:-m-8 lg:mb-8 lg:px-8 ${
          dark ? '' : lightAccent ? '' : 'bg-accent text-white'
        }`}
        style={
          dark
            ? { backgroundColor: accent, color: accentText }
            : lightAccent
              ? { backgroundColor: lightAccent, color: '#FFFFFF' }
              : undefined
        }
      >
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold leading-snug lg:text-xl">
            {t.orderNow}
          </h2>
          <p className="mt-0.5 truncate text-xs font-semibold opacity-85">
            {product.name}
          </p>
        </div>
        <p className="shrink-0 text-xl font-extrabold">
          {formatBDT(product.price)}
        </p>
      </div>
      <div className="lg:grid lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-3">
          <div
            className={`mt-3 space-y-1 text-sm ${
              dark ? 'text-[#B8B8B8]' : 'text-gray-700'
            }`}
          >
            <p>
              {t.deliveryInside}:{' '}
              {shop.delivery_inside_charge > 0
                ? formatBDT(shop.delivery_inside_charge)
                : t.freeDelivery}
            </p>
            <p>
              {t.deliveryOutside}:{' '}
              {shop.delivery_outside_charge > 0
                ? formatBDT(shop.delivery_outside_charge)
                : t.freeDelivery}
            </p>
            {data.page.delivery_info ? (
              <p className="pt-1 leading-relaxed">{data.page.delivery_info}</p>
            ) : null}
          </div>
          {preview ? (
            <p
              className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                dark
                  ? 'border border-[#34343A] bg-[#151518] text-[#B8B8B8]'
                  : 'bg-gray-50 text-gray-600'
              }`}
            >
              এটা প্রিভিউ — এখান থেকে অর্ডার দেওয়া যাবে না। প্রকাশ করা
              পেজে কাস্টমাররা এই ফর্মে অর্ডার দেবে।
            </p>
          ) : (
            <div className="mt-4">
              <OrderForm
                data={data}
                t={t}
                onPlaced={onPlaced}
                dark={dark}
                accent={accent}
                accentText={accentText}
                lightAccent={lightAccent}
              />
            </div>
          )}
        </div>
        <aside className="hidden lg:col-span-2 lg:block">
          <div
            className={`rounded-2xl border p-5 ${
              dark
                ? 'border-[#34343A] bg-[#151518]'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            {orderFirstImage ? (
              <img
                src={orderFirstImage.url}
                alt={product.name}
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
            ) : null}
            <p
              className={`mt-3 font-extrabold ${
                dark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {product.name}
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold ${
                  dark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {formatBDT(product.price)}
              </span>
              {product.old_price && product.old_price > product.price ? (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    {formatBDT(product.old_price)}
                  </span>
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    {toBnDigits(orderDiscount)}% {t.off}
                  </span>
                </>
              ) : null}
            </p>
            {orderSavings > 0 ? (
              <p className="mt-1 text-sm font-bold text-green-600">
                সাশ্রয়: {formatBDT(orderSavings)}
              </p>
            ) : null}
            <div
              className={`mt-4 space-y-2 border-t pt-4 text-sm ${
                dark
                  ? 'border-[#34343A] text-[#B8B8B8]'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              <p>✓ ক্যাশ অন ডেলিভারি</p>
              <p>✓ সারা দেশে হোম ডেলিভারি</p>
              <p>✓ অর্ডার কনফার্ম করে পাঠানো হয়</p>
              <p>
                {t.deliveryInside}:{' '}
                {shop.delivery_inside_charge > 0
                  ? formatBDT(shop.delivery_inside_charge)
                  : t.freeDelivery}
              </p>
              <p>
                {t.deliveryOutside}:{' '}
                {shop.delivery_outside_charge > 0
                  ? formatBDT(shop.delivery_outside_charge)
                  : t.freeDelivery}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

function StickyOrderBar({
  data,
  t,
  gold = false,
}: {
  data: CustomerPageData
  t: StringsType
  /** Luxury Premium টেমপ্লেটের সোনালি বার। */
  gold?: boolean
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t px-4 py-3 shadow-lg md:hidden ${
        gold
          ? 'border-[#34343A] bg-[#151518]'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div>
        <p className={`text-xs ${gold ? 'text-[#B8B8B8]' : 'text-gray-500'}`}>
          {data.product.name}
        </p>
        <p
          className={`text-lg font-extrabold ${
            gold ? 'text-[#D6B36A]' : 'text-gray-900'
          }`}
        >
          {formatBDT(data.product.price)}
        </p>
      </div>
      <a
        href="#order"
        className={`rounded-lg px-5 py-2.5 font-semibold ${
          gold ? 'bg-[#D6B36A] text-[#0B0B0D]' : 'bg-accent text-white'
        }`}
      >
        {t.orderNow}
      </a>
    </div>
  )
}

export default function CustomerPage({
  data,
  preview = false,
}: {
  data: CustomerPageData
  preview?: boolean
}) {
  const { page, product, shop, images, sellerWhatsapp } = data
  // ছোট বিবরণ থাকলে হিরোতে সেটাই এক লাইনে দেখায় (লাইভ অ্যাপের মতো);
  // না থাকলে আগের মতো বিস্তারিত বিবরণই হিরোর কপি। বিস্তারিত বিবরণ
  // গল্প/বিবরণ সেকশনে আগের মতোই থাকে।
  const shortDesc = product.short_description?.trim()
    ? product.short_description.trim()
    : null
  const heroCopy = shortDesc ?? product.description
  const [placed, setPlaced] = useState<PlacedOrder | null>(null)
  // পণ্য-ভিত্তিক SEO/OG মেটা — শুধু লাইভ পেজে; বিল্ডার প্রিভিউতে নয়।
  // সীমা: ফেসবুকের ক্রলার জাভাস্ক্রিপ্ট চালায় না, তাই ক্লায়েন্ট-সাইডে
  // বসানো এই মেটা শেয়ার প্রিভিউতে নাও দেখাতে পারে — সেজন্য প্রিরেন্ডার
  // আলাদা ধাপ হিসেবে লাগবে (এই কাজে নেই)।
  useEffect(() => {
    if (preview) return
    const title = `${product.name} | ${shop.name}`
    document.title = title
    const descText = (shortDesc ?? product.description ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160)
    const pageUrl = `${window.location.origin}/${shop.slug}/${page.slug}`
    const imageUrl = images.length > 0 ? images[0].url : ''
    const setMeta = (
      attr: 'name' | 'property',
      key: string,
      content: string,
    ) => {
      let el = document.head.querySelector(
        `meta[${attr}="${key}"]`,
      ) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }
    setMeta('name', 'description', descText || `${product.name} — ${shop.name}`)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', descText || `${product.name} — ${shop.name}`)
    setMeta('property', 'og:type', 'product')
    setMeta('property', 'og:url', pageUrl)
    if (imageUrl) setMeta('property', 'og:image', imageUrl)
    let canonical = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', pageUrl)
  }, [preview, product, shop, page, images, shortDesc])
  // Fashion Store ও Tech & Gadget-এর মেনু ও FAQ অ্যাকর্ডিয়নের অবস্থা —
  // সবার ওপরে ঘোষিত, তাই হুকের নিয়ম ভাঙে না (শুধু নিজ নিজ ব্রাঞ্চে
  // ব্যবহৃত হয়)।
  const [fashionMenuOpen, setFashionMenuOpen] = useState(false)
  const [fashionOpenFaq, setFashionOpenFaq] = useState<number | null>(null)
  // Beauty & Cosmetics-এর মেনুর অবস্থা — শুধু beauty-cosmetics ব্রাঞ্চে ব্যবহৃত হয়।
  const [beautyMenuOpen, setBeautyMenuOpen] = useState(false)
  const [techMenuOpen, setTechMenuOpen] = useState(false)
  const [techOpenFaq, setTechOpenFaq] = useState<number | null>(null)
  const t: StringsType = customerStrings(page.page_lang)
  const meta = templateById(page.template)
  const dark = meta.dark
  const discount = discountPercent(product.price, product.old_price)
  const showGallery =
    page.sections['gallery'] !== false && images.length > 0

  const headingClass = dark
    ? 'font-serif text-lg font-bold text-white'
    : 'font-serif text-lg font-bold text-gray-900'
  const bodyClass = dark ? 'text-gray-300' : 'text-gray-700'

  function renderSection(id: string) {
    switch (id) {
      case 'description': {
        const desc = product.description?.trim()
        if (!desc) return null
        return (
          <section key="description">
            <h2 className={headingClass}>{t.description}</h2>
            <p
              className={`mt-3 whitespace-pre-line text-sm leading-relaxed ${bodyClass}`}
            >
              {desc}
            </p>
          </section>
        )
      }
      case 'delivery': {
        const info = page.delivery_info?.trim()
        if (!info) return null
        return (
          <section key="delivery">
            <h2 className={headingClass}>{t.deliveryInfo}</h2>
            <div className={`mt-3 space-y-1 text-sm ${bodyClass}`}>
              <p>
                {t.deliveryInside}:{' '}
                {shop.delivery_inside_charge > 0
                  ? formatBDT(shop.delivery_inside_charge)
                  : t.freeDelivery}
              </p>
              <p>
                {t.deliveryOutside}:{' '}
                {shop.delivery_outside_charge > 0
                  ? formatBDT(shop.delivery_outside_charge)
                  : t.freeDelivery}
              </p>
              <p className="pt-1 leading-relaxed">{info}</p>
            </div>
          </section>
        )
      }
      case 'benefits':
        if (product.benefits.length === 0) return null
        return (
          <section key="benefits">
            <h2 className={headingClass}>{t.benefits}</h2>
            <ul
              className={`mt-3 space-y-2 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-2 lg:space-y-0 ${bodyClass}`}
            >
              {product.benefits.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-bold text-brand">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      case 'specs': {
        const entries = Object.entries(product.specs)
        if (entries.length === 0) return null
        return (
          <section key="specs">
            <h2 className={headingClass}>{t.specs}</h2>
            <dl
              className={`mt-3 divide-y overflow-hidden rounded-xl border ${
                dark ? 'divide-gray-700 border-gray-700' : 'divide-gray-200 border-gray-200'
              }`}
            >
              {entries.map(([key, value]) => (
                <div
                  key={key}
                  className={`flex justify-between gap-4 px-4 py-2.5 text-sm ${
                    dark ? 'bg-gray-800' : 'bg-white'
                  }`}
                >
                  <dt className="text-gray-500">{key}</dt>
                  <dd className={`font-medium ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )
      }
      case 'video': {
        const videos = pageVideos(page)
        if (!videos.some((v) => youtubeEmbedId(v.url))) return null
        return (
          <section key="video">
            <h2 className={headingClass}>{t.video}</h2>
            <VideoPlayer
              videos={videos}
              productName={product.name}
              frameClass="mt-3 aspect-video w-full overflow-hidden rounded-xl"
            />
          </section>
        )
      }
      case 'reviews':
        return (
          <section key="reviews">
            <h2 className={headingClass}>{t.reviews}</h2>
            {page.reviews.length === 0 ? (
              <p className={`mt-3 text-sm ${bodyClass}`}>{t.noReviews}</p>
            ) : (
              <div className="mt-3">
                <RatingSummary data={data} t={t} />
                <div className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  {page.reviews.map((r, i) => (
                  <article
                    key={i}
                    className={`rounded-xl border p-4 ${
                      dark
                        ? 'border-gray-700 bg-gray-800'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ReviewAvatar photoUrl={r.photo_url} name={r.name} />
                      <div>
                        <p
                          className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}
                        >
                          {r.name}
                        </p>
                        {typeof r.rating === 'number' && r.rating > 0 ? (
                          <p className="text-sm font-bold text-amber-500">
                            {'★'.repeat(Math.round(r.rating))}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <p className={`mt-2 text-sm ${bodyClass}`}>{r.text}</p>
                    {r.screenshot_url ? (
                      <ReviewScreenshot
                        url={r.screenshot_url}
                        alt={`${r.name} — রিভিউর স্ক্রিনশট`}
                      />
                    ) : null}
                  </article>
                ))}
                </div>
              </div>
            )}
          </section>
        )
      case 'faq':
        if (page.faqs.length === 0) return null
        return (
          <section key="faq">
            <h2 className={headingClass}>{t.faq}</h2>
            <div className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {page.faqs.map((f, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${
                    dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <p className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                    {f.q}
                  </p>
                  <p className={`mt-1 text-sm ${bodyClass}`}>{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )
      default:
        return null
    }
  }

  const pageShell = dark ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'
  const cardClass = dark
    ? 'rounded-2xl border border-gray-700 bg-gray-800 p-5'
    : 'rounded-2xl border border-gray-200 bg-white p-5'

  // B — প্রোডাক্ট হিরো: মোবাইলে ছবি উপরে, তথ্য নিচে (আগের মতো);
  // ডেস্কটপে (lg+) দুই কলাম — ছবি বামে, তথ্য ডানে (নতুন টেমপ্লেটগুলোর
  // মতো)। সব টেমপ্লেটে একই 4:3 ফ্রেম। পরিমাণ শুধু অর্ডার ফর্মে থাকে।
  const hero = (
    <div
      className={
        showGallery
          ? 'lg:grid lg:grid-cols-2 lg:items-start lg:gap-10'
          : undefined
      }
    >
      <div>
        {showGallery ? (
          <Gallery images={images} productName={product.name} />
        ) : null}
      </div>
      <div>
        <h1
          className={`mt-5 font-serif text-2xl font-extrabold leading-snug md:text-3xl lg:mt-0 ${
            dark ? 'text-white' : 'text-gray-900'
          }`}
        >
        {product.name}
      </h1>
      {product.category ? (
        <p className={`mt-1 text-xs font-bold ${bodyClass}`}>
          {product.category}
        </p>
      ) : null}
      <div className="mt-2">
        <RatingSummary data={data} t={t} />
      </div>
      <div className="mt-3">
        <PriceRow data={data} dark={dark} />
      </div>
      {heroCopy ? (
        <p className={`mt-3 text-sm leading-relaxed ${bodyClass}`}>
          {heroCopy}
        </p>
      ) : null}
      {!meta.stickyBar ? (
        <a
          href="#order"
          className="mt-5 block rounded-lg bg-accent px-4 py-3 text-center font-semibold text-white"
        >
          {t.orderNow}
        </a>
      ) : null}
      </div>
    </div>
  )

  // সেকশনের ক্রম — বিল্ডারের ক্রমেই দেখায় (গ্যালারি হিরোতে থাকে, তাই
  // ক্রমে থাকলেও এখানে আসে না); বন্ধ করা সেকশন আসে না। Social Proof-এ
  // রিভিউ সবার আগে (চালু থাকলে)।
  let sectionOrder = page.section_order.filter(
    (id) => id !== 'gallery' && page.sections[id] !== false,
  )
  if (page.template === 'social-proof' && sectionOrder.includes('reviews')) {
    sectionOrder = [
      'reviews',
      ...sectionOrder.filter((id) => id !== 'reviews'),
    ]
  }

  // সেকশন ব্যান্ড — ডেস্কটপে (lg+) প্রতিটি সেকশন পুরো চওড়ায় একটি
  // ব্যান্ডে বসে (পাল্টাপাল্টি হালকা টিন্ট), যাতে 1440–1920px-এ পেজ
  // ফাঁকা না লাগে। মোবাইলে ও বিল্ডার প্রিভিউতে আগের মতোই সরল স্ট্যাক।
  const sections = preview ? (
    <div className="space-y-8">{sectionOrder.map((id) => renderSection(id))}</div>
  ) : (
    <div className="space-y-8 lg:space-y-0">
      {sectionOrder.map((id, i) => {
        const node = renderSection(id)
        if (!node) return null
        return (
          <div
            key={id}
            className={`lg:w-[100vw] lg:px-4 lg:py-12 lg:[margin-left:calc(50%-50vw)] ${
              i % 2 === 0 ? (dark ? 'lg:bg-gray-800/60' : 'lg:bg-gray-50') : ''
            }`}
          >
            <div className="mx-auto lg:max-w-6xl">{node}</div>
          </div>
        )
      })}
    </div>
  )

  const shopHeader = (
    <header
      className={`flex items-center justify-between px-4 py-3 ${
        page.template === 'modern-premium'
          ? 'bg-brand text-white'
          : page.template === 'social-proof'
            ? 'border-b border-[#BBF7D0] bg-[#F0FDF4] text-gray-900'
            : dark
              ? 'bg-gray-800 text-white'
              : 'border-b border-gray-200 bg-white'
      }`}
    >
      <span className="flex items-center gap-2 font-bold">
        {shop.logo_url ? (
          <img src={shop.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm text-white">
            {shop.name.charAt(0)}
          </span>
        )}
        <span className={page.template === 'modern-premium' ? 'text-white' : ''}>
          {shop.name}
        </span>
      </span>
      <span
        className={`text-xs ${
          page.template === 'modern-premium' ? 'text-white/80' : 'text-gray-500'
        }`}
      >
        {t.shopPage}
      </span>
    </header>
  )

  const announcement =
    discount > 0 ? (
      <div className="bg-accent px-4 py-2 text-center text-sm font-semibold text-white">
        {t.discountRunning(discount)}
      </div>
    ) : null

  const orderBox = (
    <div className="mt-8">
      <OrderSection
        data={data}
        t={t}
        placed={placed}
        preview={preview}
        onPlaced={setPlaced}
        onOrderAgain={() => setPlaced(null)}
      />
    </div>
  )

// যোগাযোগ কার্ড — লাইভ অ্যাপের মতো সব টেমপ্লেটের ফুটারের ওপরে:
// দোকানের লোগো/অক্ষর টাইল, WhatsApp বাটন, ট্রাস্ট লাইন।
// স্ট্যান্ডঅ্যালোনে সেলারের ফোন নম্বর নেই (শুধু WhatsApp) —
// তাই কল বাটন নেই, শুধু WhatsApp + ট্রাস্ট লাইন।
function ContactCard({ data, dark }: { data: CustomerPageData; dark: boolean }) {
  const { shop, sellerWhatsapp, product } = data
  if (!sellerWhatsapp) return null
  const waText = encodeURIComponent(
    `আসসালামু আলাইকুম, ${shop.name} — ${product.name} সম্পর্কে জানতে চাই।`,
  )
  return (
    <div className="mx-auto mt-6 max-w-2xl px-4">
      <div
        className={`overflow-hidden rounded-3xl border shadow-md ${
          dark
            ? 'border-gray-700 bg-gray-800 shadow-black/30'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="h-1.5 bg-gradient-to-r from-brand via-accent to-brand" />
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-brand/30"
              />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#004d38] text-2xl font-extrabold text-white shadow-md ring-2 ring-brand/20">
                {shop.name.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <p
                className={`font-serif text-lg font-bold leading-snug ${
                  dark ? 'text-white' : 'text-gray-900'
                }`}
              >
                আমাদের সাথে যোগাযোগ করুন
              </p>
              <p
                className={`mt-0.5 truncate text-sm ${
                  dark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {shop.name}
              </p>
            </div>
          </div>
          <a
            href={`https://wa.me/${sellerWhatsapp}?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 block rounded-xl bg-[#25d366] px-4 py-3.5 text-center text-base font-bold text-white shadow-md shadow-[#25d366]/30 transition hover:bg-[#1fb857] active:scale-[0.99]"
          >
            WhatsApp-এ মেসেজ করুন
          </a>
          <div
            className={`mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 border-t pt-4 text-xs font-medium ${
              dark
                ? 'border-gray-700 text-gray-400'
                : 'border-gray-100 text-gray-500'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600">
                ✓
              </span>
              সারা দেশে ডেলিভারি
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600">
                ✓
              </span>
              অর্ডার কনফার্ম করে পাঠানো হয়
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const footer = (
  <>
    <ContactCard data={data} dark={dark} />
    <footer
      className={`mt-10 border-t px-4 py-6 text-center text-xs ${
        dark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
      }`}
    >
      <a
        href="/"
        className="inline-block font-bold"
        aria-label="Orderlink — হোম পেজ"
      >
        <span className="text-brand">Order</span>
        <span className="text-accent">link</span>
      </a>
      <p className="mt-1">{shop.name}</p>
    </footer>
  </>
  )

  // স্টিকি মোবাইল অর্ডার বার — শুধু Aura/Nova/Social Proof-এ (লাইভ
  // অ্যাপের মতো; রেজিস্ট্রির stickyBar দেখে বসে)। Luxury-র নিজের
  // সোনালি বার, fashion/tech/beauty/bd-র নিজের বার — এটা তারা
  // ব্যবহার করে না।
  const sticky = meta.stickyBar ? (
    <StickyOrderBar data={data} t={t} />
  ) : null

  // ---- Luxury Premium (Template 01) — কালো-সোনালি বিলাসবহুল ডার্ক থিম ----
  // ব্রিফের ১৫ সেকশন: ঘোষণা, হেডার, হিরো, গ্যালারি, আস্থা, কেন বেছে নেবেন,
  // গল্প, বৈশিষ্ট্য, স্পেসিফিকেশন, রিভিউ, অফার, অর্ডার ফর্ম, ডেলিভারি তথ্য,
  // FAQ, ফুটার। আসল ডাটা ছাড়া কোনো সেকশন ভুয়া কনটেন্ট দিয়ে ভরা হয় না:
  // গল্প শুধু বিবরণ থাকলে, বৈশিষ্ট্য শুধু benefits থাকলে, অফার শুধু ছাড়
  // থাকলে, ভিডিও শুধু লিংক থাকলে দেখায়। ভেরিয়েন্ট মডেলে নেই — ফর্মে নেই।
  if (page.template === 'luxury-premium') {
    const showBenefits =
      page.sections['benefits'] !== false && product.benefits.length > 0
    const specEntries = Object.entries(product.specs)
    const showSpecs =
      page.sections['specs'] !== false && specEntries.length > 0
    const videos = pageVideos(page)
    const showVideo =
      page.sections['video'] !== false &&
      videos.some((v) => youtubeEmbedId(v.url))
    const showReviews = page.sections['reviews'] !== false
    const showFaq = page.sections['faq'] !== false && page.faqs.length > 0
    const freeThreshold =
      shop.free_delivery_threshold !== null &&
      shop.free_delivery_threshold > 0
        ? Number(shop.free_delivery_threshold)
        : null
    const storyImage =
      images.length > 1 ? images[1] : images.length > 0 ? images[0] : null
    const luxRated = page.reviews.filter(
      (r) => typeof r.rating === 'number' && r.rating > 0,
    )
    const luxAvg =
      luxRated.length > 0
        ? luxRated.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
          luxRated.length
        : 0
    const trustItems = [
      { glyph: '✦', title: t.luxuryTrustAuthentic, desc: t.luxuryTrustAuthenticDesc },
      { glyph: '◆', title: t.luxuryTrustQuality, desc: t.luxuryTrustQualityDesc },
      { glyph: '✓', title: t.luxuryTrustSecure, desc: t.luxuryTrustSecureDesc },
      { glyph: '➤', title: t.luxuryTrustFast, desc: t.luxuryTrustFastDesc },
    ]
    const whyItems = [
      { title: t.luxuryWhyQuality, desc: t.luxuryWhyQualityDesc },
      { title: t.luxuryWhyCraft, desc: t.luxuryWhyCraftDesc },
      { title: t.luxuryWhyDurable, desc: t.luxuryWhyDurableDesc },
      { title: t.luxuryWhyPractical, desc: t.luxuryWhyPracticalDesc },
    ]
    const luxH2 = 'font-serif text-2xl font-bold text-white'
    const luxEyebrow =
      'text-[11px] font-bold uppercase tracking-[0.25em] text-[#D6B36A]'
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-white">
        {/* ০১ ঘোষণা বার — শুধু আসল ছাড় বা আসল ফ্রি-ডেলিভারি সীমা থাকলে */}
        {discount > 0 ? (
          <div className="bg-[#D6B36A] px-4 py-2 text-center text-sm font-bold text-[#0B0B0D]">
            {t.discountRunning(discount)}
          </div>
        ) : freeThreshold ? (
          <div className="bg-[#D6B36A] px-4 py-2 text-center text-sm font-bold text-[#0B0B0D]">
            {t.freeDeliveryAbove(formatBDT(freeThreshold))}
          </div>
        ) : null}
        {/* ০২ দোকানের হেডার */}
        <header className="flex items-center justify-between border-b border-[#34343A] bg-[#0B0B0D] px-4 py-3">
          <span className="flex items-center gap-2 font-bold text-white">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt=""
                className="h-9 w-9 rounded-full border border-[#34343A] object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D6B36A] text-sm font-extrabold text-[#0B0B0D]">
                {shop.name.charAt(0)}
              </span>
            )}
            <span>{shop.name}</span>
          </span>
          {sellerWhatsapp ? (
            <a
              href={`https://wa.me/${sellerWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#34343A] px-3 py-1.5 text-xs font-semibold text-[#D6B36A]"
            >
              WhatsApp
            </a>
          ) : (
            <span className="text-xs text-[#B8B8B8]">{t.shopPage}</span>
          )}
        </header>
        <main className="mx-auto max-w-2xl px-4 pt-6 md:max-w-4xl lg:max-w-6xl">
          {/* ০৩ হিরো + ০৪ গ্যালারি */}
          <div className="grid gap-6 md:grid-cols-2 md:items-start">
            <div>
              {showGallery ? (
                <Gallery images={images} productName={product.name} />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-[#34343A] bg-[#151518] text-[#B8B8B8]">
                  ছবি যোগ করা হয়নি
                </div>
              )}
            </div>
            <div>
              <p className={luxEyebrow}>{t.luxuryEyebrow}</p>
              <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-white md:text-4xl">
                {product.name}
              </h1>
              {product.category ? (
                <p className="mt-1 text-xs font-bold text-[#B8B8B8]">
                  {product.category}
                </p>
              ) : null}
              {luxRated.length > 0 ? (
                <p className="mt-2 text-sm text-[#B8B8B8]">
                  <span className="font-bold text-[#D6B36A]">
                    {'★'.repeat(Math.round(luxAvg))}
                  </span>{' '}
                  {toBnDigits(String(Math.round(luxAvg * 10) / 10))} ·{' '}
                  {t.basedOnReviews(luxRated.length)}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#D6B36A]">
                  {formatBDT(product.price)}
                </span>
                {product.old_price && product.old_price > product.price ? (
                  <>
                    <span className="text-lg text-[#B8B8B8] line-through">
                      {formatBDT(product.old_price)}
                    </span>
                    <span className="rounded-full bg-[#D6B36A] px-2.5 py-0.5 text-xs font-bold text-[#0B0B0D]">
                      {toBnDigits(discount)}% {t.off}
                    </span>
                  </>
                ) : null}
              </div>
              {heroCopy ? (
                <p className="mt-4 text-sm leading-relaxed text-[#B8B8B8]">
                  {heroCopy}
                </p>
              ) : null}
              <a
                href="#order"
                className="mt-6 block rounded-xl bg-[#D6B36A] px-4 py-3.5 text-center font-bold text-[#0B0B0D]"
              >
                {t.orderNow}
              </a>
            </div>
          </div>

          {/* ০৫ আস্থার নিশ্চয়তা */}
          <section className="mt-12">
            <p className={luxEyebrow}>{t.luxuryTrustTitle}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {trustItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#34343A] bg-[#1D1D21] p-4"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D6B36A]/60 text-base text-[#D6B36A]">
                    {item.glyph}
                  </span>
                  <p className="mt-3 text-sm font-bold text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#B8B8B8]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ০৬ কেন এই পণ্যটি বেছে নেবেন */}
          <section className="mt-12">
            <h2 className={luxH2}>{t.luxuryWhyTitle}</h2>
            <span className="mt-3 block h-px w-12 bg-[#D6B36A]" />
            <div className="mt-5 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {whyItems.map((item, i) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-[#34343A] bg-[#1D1D21] p-4"
                >
                  <span className="font-serif text-2xl font-bold text-[#D6B36A]">
                    {toBnDigits(i + 1)}
                  </span>
                  <div>
                    <p className="font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#B8B8B8]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ০৭ পণ্যের গল্প — শুধু বিবরণ থাকলে */}
          {product.description ? (
            <section className="mt-12">
              <p className={luxEyebrow}>{t.luxuryStoryTitle}</p>
              {storyImage ? (
                <div className="mt-4">
                  <FramedPhoto src={storyImage.url} alt={product.name} />
                </div>
              ) : null}
              <p className="mt-5 font-serif text-lg leading-relaxed text-[#E8E8E8]">
                {product.description}
              </p>
            </section>
          ) : null}

          {/* ০৮ পণ্যের বৈশিষ্ট্য — আসল benefits থাকলে */}
          {showBenefits ? (
            <section className="mt-12">
              <h2 className={luxH2}>{t.luxuryFeaturesTitle}</h2>
              <span className="mt-3 block h-px w-12 bg-[#D6B36A]" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {product.benefits.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-[#34343A] bg-[#1D1D21] p-4"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D6B36A] text-sm font-extrabold text-[#0B0B0D]">
                      ✓
                    </span>
                    <span className="text-sm leading-relaxed text-white">
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* ০৯ স্পেসিফিকেশন */}
          {showSpecs ? (
            <section className="mt-12">
              <h2 className={luxH2}>{t.specs}</h2>
              <span className="mt-3 block h-px w-12 bg-[#D6B36A]" />
              <dl className="mt-5 divide-y divide-[#34343A] overflow-hidden rounded-2xl border border-[#34343A]">
                {specEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 bg-[#1D1D21] px-4 py-3 text-sm"
                  >
                    <dt className="text-[#B8B8B8]">{key}</dt>
                    <dd className="text-right font-medium text-white">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {/* ভিডিও — বিল্ডারে চালু থাকলে ও লিংক থাকলে */}
          {showVideo ? (
            <section className="mt-12">
              <h2 className={luxH2}>{t.video}</h2>
              <span className="mt-3 block h-px w-12 bg-[#D6B36A]" />
              <VideoPlayer
                videos={videos}
                productName={product.name}
                frameClass="mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-[#34343A]"
                thumbActiveClass="border-[#D6B36A]"
              />
            </section>
          ) : null}

          {/* ১০ কাস্টমার রিভিউ — শুধু আসল রিভিউ */}
          {showReviews ? (
            <section className="mt-12">
              <h2 className={luxH2}>{t.reviews}</h2>
              <span className="mt-3 block h-px w-12 bg-[#D6B36A]" />
              {page.reviews.length === 0 ? (
                <p className="mt-4 text-sm text-[#B8B8B8]">{t.noReviews}</p>
              ) : (
                <div className="mt-5">
                  {luxRated.length > 0 ? (
                    <p className="text-sm text-[#B8B8B8]">
                      <span className="font-bold text-[#D6B36A]">
                        {'★'.repeat(Math.round(luxAvg))}
                      </span>{' '}
                      {toBnDigits(String(Math.round(luxAvg * 10) / 10))} ·{' '}
                      {t.basedOnReviews(luxRated.length)}
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  {page.reviews.map((r, i) => (
                    <article
                      key={i}
                      className="rounded-2xl border border-[#34343A] bg-[#1D1D21] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <ReviewAvatar photoUrl={r.photo_url} name={r.name} />
                        <div>
                          <p className="font-semibold text-white">{r.name}</p>
                          {typeof r.rating === 'number' && r.rating > 0 ? (
                            <p className="text-sm font-bold text-[#D6B36A]">
                              {'★'.repeat(Math.round(r.rating))}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#B8B8B8]">
                        {r.text}
                      </p>
                      {r.screenshot_url ? (
                        <ReviewScreenshot
                          url={r.screenshot_url}
                          alt={`${r.name} — রিভিউর স্ক্রিনশট`}
                        />
                      ) : null}
                    </article>
                  ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* ১১ বিশেষ অফার — শুধু আসল ছাড় থাকলে */}
          {discount > 0 ? (
            <section className="mt-12 rounded-2xl border border-[#D6B36A]/60 bg-gradient-to-b from-[#1D1D21] to-[#151518] p-6 text-center">
              <p className={luxEyebrow}>{t.luxuryOfferTitle}</p>
              <p className="mt-3 font-serif text-4xl font-bold text-[#D6B36A]">
                {toBnDigits(discount)}% {t.off}
              </p>
              <p className="mt-2 text-sm text-[#B8B8B8]">
                {t.discountRunning(discount)}
              </p>
              <div className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-2xl font-extrabold text-white">
                  {formatBDT(product.price)}
                </span>
                {product.old_price && product.old_price > product.price ? (
                  <span className="text-base text-[#B8B8B8] line-through">
                    {formatBDT(product.old_price)}
                  </span>
                ) : null}
              </div>
              <a
                href="#order"
                className="mt-5 block rounded-xl bg-[#D6B36A] px-4 py-3.5 font-bold text-[#0B0B0D]"
              >
                {t.orderNow}
              </a>
            </section>
          ) : null}

          {/* ১২ অর্ডার ফর্ম — আসল ফর্ম, গাঢ় রূপ */}
          <div className="mt-12">
            <OrderSection
              data={data}
              t={t}
              placed={placed}
              preview={preview}
              onPlaced={setPlaced}
              onOrderAgain={() => setPlaced(null)}
              dark
            />
          </div>

          {/* ১৩ ডেলিভারি তথ্য — দোকানের আসল চার্জ থেকে */}
          <section className="mt-12 rounded-2xl border border-[#34343A] bg-[#1D1D21] p-5">
            <h2 className={luxH2}>{t.luxuryDeliveryTitle}</h2>
            <span className="mt-3 block h-px w-12 bg-[#D6B36A]" />
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex justify-between gap-4">
                <span className="text-[#B8B8B8]">{t.deliveryInside}</span>
                <span className="font-semibold text-white">
                  {shop.delivery_inside_charge > 0
                    ? formatBDT(shop.delivery_inside_charge)
                    : t.freeDelivery}
                </span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-[#B8B8B8]">{t.deliveryOutside}</span>
                <span className="font-semibold text-white">
                  {shop.delivery_outside_charge > 0
                    ? formatBDT(shop.delivery_outside_charge)
                    : t.freeDelivery}
                </span>
              </p>
              {freeThreshold ? (
                <p className="text-xs leading-relaxed text-[#D6B36A]">
                  {t.freeDeliveryAbove(formatBDT(freeThreshold))}
                </p>
              ) : null}
              <p className="border-t border-[#34343A] pt-3 text-xs leading-relaxed text-[#B8B8B8]">
                {t.luxuryDeliverySupport}
              </p>
            </div>
          </section>

          {/* ১৪ জিজ্ঞাসা — অ্যাকর্ডিয়ন */}
          {showFaq ? (
            <section className="mt-12">
              <h2 className={luxH2}>{t.faq}</h2>
              <span className="mt-3 block h-px w-12 bg-[#D6B36A]" />
              <div className="mt-5 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {page.faqs.map((f, i) => (
                  <details
                    key={i}
                    className="rounded-2xl border border-[#34343A] bg-[#1D1D21] px-4 py-3"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-white">
                      {f.q}
                      <span className="shrink-0 text-lg text-[#D6B36A]">+</span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-[#B8B8B8]">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </main>
        <ContactCard data={data} dark />
        <footer className="mt-10 border-t border-[#34343A] px-4 py-8 text-center">
          <a
            href="/"
            className="inline-block font-serif text-xl font-bold"
            aria-label="Orderlink — হোম পেজ"
          >
            <span className="text-[#D6B36A]">Order</span>
            <span className="text-white">link</span>
          </a>
          <p className="mt-2 text-sm font-semibold text-white">{shop.name}</p>
          {sellerWhatsapp ? (
            <a
              href={`https://wa.me/${sellerWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-full border border-[#34343A] px-4 py-2 text-xs font-semibold text-[#D6B36A]"
            >
              WhatsApp-এ যোগাযোগ করুন
            </a>
          ) : null}
          <p className="mt-4 text-xs text-[#B8B8B8]">
            © {toBnDigits(new Date().getFullYear())} {shop.name}
          </p>
        </footer>
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 md:hidden" aria-hidden="true" />
        <StickyOrderBar data={data} t={t} gold />
      </div>
    )
  }

  // ---- বাকি ৮ টেমপ্লেটের লেআউট ----
  if (page.template === 'premium-ecommerce') {
    return (
      <div className="min-h-screen bg-[#F3F4F6] text-gray-900">
        {announcement}
        {shopHeader}
        <main className="mx-auto max-w-5xl px-4 pt-6 lg:max-w-6xl lg:pt-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>{showGallery ? <Gallery images={images} productName={product.name} /> : null}</div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 md:text-3xl">
                  {product.name}
                </h1>
                {product.category ? (
                  <p className="mt-1 text-xs font-bold text-gray-500">
                    {product.category}
                  </p>
                ) : null}
                <div className="mt-2">
                  <RatingSummary data={data} t={t} />
                </div>
                <div className="mt-3">
                  <PriceRow data={data} dark={false} />
                </div>
                {heroCopy ? (
                  <p className="mt-3 text-sm leading-relaxed text-gray-700">
                    {heroCopy}
                  </p>
                ) : null}
                <a
                  href="#order"
                  className="mt-5 block rounded-lg bg-accent px-4 py-3 text-center font-semibold text-white"
                >
                  {t.orderNow}
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8">{sections}</div>
          {orderBox}
        </main>
        {footer}
        {sticky}
      </div>
    )
  }

  if (page.template === 'offer-special') {
    return (
      <div className={`min-h-screen ${pageShell}`}>
        <div className="bg-accent px-4 py-3 text-center">
          <p className="text-lg font-extrabold text-white">
            {discount > 0
              ? `${toBnDigits(discount)}% ${t.off} — ${t.orderNow}!`
              : product.name}
          </p>
        </div>
        {shopHeader}
        <main className="mx-auto max-w-2xl px-4 pt-6 lg:max-w-6xl lg:pt-10">
          {hero}
          <div className="mt-8">{sections}</div>
          {orderBox}
        </main>
        {footer}
        {sticky}
      </div>
    )
  }

  if (page.template === 'aura-premium') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-light via-white to-white text-gray-900">
        {announcement}
        {shopHeader}
        <main className="mx-auto max-w-2xl px-4 pt-6 lg:max-w-6xl">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            {hero}
          </div>
          <div className="mt-8">{sections}</div>
          {orderBox}
        </main>
        {footer}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 md:hidden" aria-hidden="true" />
        {sticky}
      </div>
    )
  }

  if (page.template === 'nova-editorial') {
    return (
      <div className={`min-h-screen ${pageShell}`}>
        {announcement}
        {shopHeader}
        <main className="mx-auto max-w-3xl px-4 pt-8 lg:max-w-6xl">
          {showGallery ? (
            <Gallery images={images} productName={product.name} />
          ) : null}
          <h1 className="mt-8 font-serif text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
            {product.name}
          </h1>
          {product.category ? (
            <p className="mt-1 text-xs font-bold text-gray-500">
              {product.category}
            </p>
          ) : null}
          <div className="mt-3">
            <RatingSummary data={data} t={t} />
          </div>
          <div className="mt-4">
            <PriceRow data={data} dark={false} />
          </div>
          {heroCopy ? (
            <p className="mt-6 text-lg leading-relaxed text-gray-700">
              {heroCopy}
            </p>
          ) : null}
          <div className="mt-10">{sections}</div>
          {orderBox}
        </main>
        {footer}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 md:hidden" aria-hidden="true" />
        {sticky}
      </div>
    )
  }

  if (page.template === 'modern-premium') {
    return (
      <div className={`min-h-screen ${pageShell}`}>
        {announcement}
        {shopHeader}
        <main className="mx-auto max-w-2xl px-4 pt-6 lg:max-w-6xl lg:pt-10">
          <div className={cardClass}>{hero}</div>
          <div className="mt-8">{sections}</div>
          {orderBox}
        </main>
        {footer}
        {sticky}
      </div>
    )
  }

  if (page.template === 'premium-dark') {
    return (
      <div className={`min-h-screen ${pageShell}`}>
        {announcement}
        {shopHeader}
        <main className="mx-auto max-w-2xl px-4 pt-6 lg:max-w-6xl lg:pt-10">
          {hero}
          <div className="mt-8">{sections}</div>
          {orderBox}
        </main>
        {footer}
        {sticky}
      </div>
    )
  }

  if (page.template === 'social-proof') {
    // আস্থার ফিতা — শুধু আসল রেটিং থাকলেই দেখায় (RatingSummary-এর
    // মতোই হিসাব; রিভিউ না থাকলে ফিতাটা আসে না, ভুয়া রেটিং নয়)।
    const spRated = page.reviews.filter(
      (r) => typeof r.rating === 'number' && r.rating > 0,
    )
    const spAvg =
      spRated.length > 0
        ? Math.round(
            (spRated.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
              spRated.length) *
              10,
          ) / 10
        : 0
    return (
      <div className={`min-h-screen ${pageShell}`}>
        {announcement}
        {shopHeader}
        {spRated.length > 0 ? (
          <div className="bg-[#DCFCE7] px-4 py-2 text-center text-sm font-bold text-[#166534]">
            ★ {toBnDigits(String(spAvg))} ·{' '}
            {t.basedOnReviews(spRated.length)}
          </div>
        ) : null}
        <main className="mx-auto max-w-2xl px-4 pt-6 lg:max-w-6xl">
          {hero}
          <div className="mt-8">{sections}</div>
          {orderBox}
        </main>
        {footer}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 md:hidden" aria-hidden="true" />
        {sticky}
      </div>
    )
  }

  // Fashion Store (light, editorial) — Template 02
  // প্যালেট: bg #FAF9F6, surface #FFFFFF, text #171717, secondary #777777,
  // accent #1D7658, soft #EAF3ED, border #EAE8E2। সাইজ/রং ভেরিয়েন্ট নেই —
  // মডেলে সেসব ফিল্ড নেই বলে Choose-Your-Style ও সাইজ গাইড সেকশন নেই।
  if (page.template === 'fashion-store') {
    // পেজের ভাষা অনুযায়ী শিরোনাম (t-তে নেই এমন ফ্যাশন-নির্দিষ্ট লেখা)।
    const L = (bn: string, en: string) =>
      page.page_lang === 'en' ? en : bn
    const specEntries = Object.entries(product.specs)
    const showBenefits =
      page.sections['benefits'] !== false && product.benefits.length > 0
    const showSpecs =
      page.sections['specs'] !== false && specEntries.length > 0
    const videos = pageVideos(page)
    const showVideo =
      page.sections['video'] !== false &&
      videos.some((v) => youtubeEmbedId(v.url))
    const showReviews = page.sections['reviews'] !== false
    const showFaq =
      page.sections['faq'] !== false && page.faqs.length > 0
    const extraImages = images.slice(1)

    const fashionAnnouncement =
      discount > 0 ? (
        <div className="bg-[#1D7658] px-4 py-2 text-center text-sm font-semibold text-white">
          {t.discountRunning(discount)}
        </div>
      ) : shop.free_delivery_threshold !== null &&
        shop.free_delivery_threshold > 0 ? (
        <div className="bg-[#EAF3ED] px-4 py-2 text-center text-sm font-semibold text-[#1D7658]">
          {t.freeDeliveryAbove(formatBDT(shop.free_delivery_threshold))}
        </div>
      ) : null

    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#171717]">
        {fashionAnnouncement}
        <header className="relative border-b border-[#EAE8E2] bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1D7658] text-base font-extrabold text-white">
                  {shop.name.charAt(0)}
                </span>
              )}
              <span className="text-base font-extrabold tracking-wide">
                {shop.name}
              </span>
            </span>
            <div className="flex items-center gap-1">
              <a
                href="#order"
                className="hidden rounded-full bg-[#1D7658] px-4 py-2 text-sm font-bold text-white sm:block"
              >
                {L('এখনই অর্ডার করুন', 'Order Now')}
              </a>
              <button
                type="button"
                onClick={() => setFashionMenuOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[#171717]"
                aria-label="মেনু"
                aria-expanded={fashionMenuOpen}
              >
                ☰
              </button>
            </div>
          </div>
          {fashionMenuOpen ? (
            <nav className="absolute inset-x-4 top-full z-50 rounded-2xl border border-[#EAE8E2] bg-white p-2 shadow-lg">
              {[
                { href: '#order', label: L('এখনই অর্ডার করুন', 'Order Now') },
                { href: '#reviews', label: L('কাস্টমার রিভিউ', 'Customer Reviews') },
                { href: '#delivery', label: L('ডেলিভারি ও রিটার্ন', 'Delivery & Returns') },
                { href: '#faq', label: L('জিজ্ঞাসা', 'FAQ') },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setFashionMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#171717] hover:bg-[#FAF9F6]"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          ) : null}
        </header>

        <main className="mx-auto max-w-5xl px-4 pt-6 lg:max-w-6xl">
          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            <div>
              {showGallery ? (
                <Gallery images={images} productName={product.name} />
              ) : null}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#1D7658]">
                {shop.name}
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold leading-tight md:text-4xl">
                {product.name}
              </h1>
              {product.category ? (
                <p className="mt-1 text-xs font-bold text-[#777777]">
                  {product.category}
                </p>
              ) : null}
              <div className="mt-3">
                <RatingSummary data={data} t={t} />
              </div>
              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-extrabold">
                  {formatBDT(product.price)}
                </span>
                {product.old_price && product.old_price > product.price ? (
                  <>
                    <span className="text-lg text-[#777777] line-through">
                      {formatBDT(product.old_price)}
                    </span>
                    <span className="rounded-full bg-[#1D7658] px-2.5 py-0.5 text-xs font-bold text-white">
                      {toBnDigits(discount)}% {L('ছাড়', 'OFF')}
                    </span>
                  </>
                ) : null}
              </div>
              {heroCopy ? (
                <p className="mt-4 text-[15px] leading-relaxed text-[#555555]">
                  {heroCopy}
                </p>
              ) : null}
              <a
                href="#order"
                className="mt-6 block rounded-full bg-[#1D7658] px-4 py-3.5 text-center font-bold text-white"
              >
                {L('এখনই অর্ডার করুন', 'Order Now')}
              </a>
              <p className="mt-3 text-center text-xs text-[#777777]">
                {t.deliveryInside}:{' '}
                {shop.delivery_inside_charge > 0
                  ? formatBDT(shop.delivery_inside_charge)
                  : t.freeDelivery}
                {' · '}
                {t.deliveryOutside}:{' '}
                {shop.delivery_outside_charge > 0
                  ? formatBDT(shop.delivery_outside_charge)
                  : t.freeDelivery}
              </p>
            </div>
          </div>

          {showBenefits ? (
            <section className="mt-12">
              <p className="text-xs font-bold uppercase tracking-wide text-[#1D7658]">
                {L('কেন এই পণ্যটি', 'Why this product')}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold">
                {L('ফ্যাশন হাইলাইটস', 'Fashion Highlights')}
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {product.benefits.map((b, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-[#EAE8E2] bg-white p-4"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF3ED] font-bold text-[#1D7658]">
                      ✓
                    </span>
                    <p className="mt-3 text-sm font-semibold leading-relaxed">
                      {b}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {extraImages.length > 0 && showGallery ? (
            <section className="mt-12">
              <p className="text-xs font-bold uppercase tracking-wide text-[#1D7658]">
                {L('লাইফস্টাইল', 'Lifestyle')}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold">
                {L('স্টাইলে দেখুন', 'Styled in Real Life')}
              </h2>
              <div className="mt-5 space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {extraImages.map((img) => (
                  <FramedPhoto key={img.id} src={img.url} alt={product.name} />
                ))}
              </div>
            </section>
          ) : null}

          {showSpecs ? (
            <section className="mt-12">
              <p className="text-xs font-bold uppercase tracking-wide text-[#1D7658]">
                {L('বিস্তারিত', 'Details')}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold">
                {L('পণ্যের বিবরণ', 'Product Details')}
              </h2>
              <dl className="mt-5 divide-y divide-[#EAE8E2] overflow-hidden rounded-2xl border border-[#EAE8E2] bg-white">
                {specEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <dt className="text-[#777777]">{key}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {discount > 0 ? (
            <section className="mt-12 rounded-3xl bg-[#1D7658] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-white/80">
                {L('বিশেষ অফার', 'Special Offer')}
              </p>
              <p className="mt-2 font-serif text-3xl font-bold">
                {toBnDigits(discount)}% {L('ছাড়', 'OFF')}
              </p>
              <p className="mt-2 text-sm text-white/85">
                {L(
                  'এখন অর্ডার করলেই ছাড়ের দামে পাচ্ছেন',
                  'Order now at the discounted price',
                )}
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold">
                  {formatBDT(product.price)}
                </span>
                {product.old_price ? (
                  <span className="text-white/70 line-through">
                    {formatBDT(product.old_price)}
                  </span>
                ) : null}
              </div>
              <a
                href="#order"
                className="mt-5 block rounded-full bg-white px-4 py-3 text-center font-bold text-[#1D7658]"
              >
                {L('এখনই অর্ডার করুন', 'Order Now')}
              </a>
            </section>
          ) : null}

          {showVideo ? (
            <section className="mt-12">
              <h2 className="font-serif text-2xl font-bold">{t.video}</h2>
              <VideoPlayer
                videos={videos}
                productName={product.name}
                frameClass="mt-4 aspect-video w-full overflow-hidden rounded-2xl"
                thumbActiveClass="border-[#1D7658]"
              />
            </section>
          ) : null}

          {showReviews ? (
            <section id="reviews" className="mt-12">
              <p className="text-xs font-bold uppercase tracking-wide text-[#1D7658]">
                {L('মতামত', 'Reviews')}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold">
                {t.reviews}
              </h2>
              {page.reviews.length === 0 ? (
                <p className="mt-4 text-sm text-[#777777]">{t.noReviews}</p>
              ) : (
                <div className="mt-5">
                  <RatingSummary data={data} t={t} />
                  <div className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  {page.reviews.map((r, i) => (
                    <article
                      key={i}
                      className="rounded-2xl border border-[#EAE8E2] bg-white p-4"
                    >
                      <div className="flex items-center gap-3">
                        <ReviewAvatar photoUrl={r.photo_url} name={r.name} />
                        <div>
                          <p className="font-semibold">{r.name}</p>
                          {typeof r.rating === 'number' && r.rating > 0 ? (
                            <p className="text-sm font-bold text-amber-500">
                              {'★'.repeat(Math.round(r.rating))}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#555555]">
                        {r.text}
                      </p>
                      {r.screenshot_url ? (
                        <ReviewScreenshot
                          url={r.screenshot_url}
                          alt={`${r.name} — রিভিউর স্ক্রিনশট`}
                        />
                      ) : null}
                    </article>
                  ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          <div className="mt-12">{orderBox}</div>

          <section id="delivery" className="mt-12">
            <p className="text-xs font-bold uppercase tracking-wide text-[#1D7658]">
              {L('ডেলিভারি', 'Delivery')}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold">
              {L('ডেলিভারি ও রিটার্ন', 'Delivery & Returns')}
            </h2>
            <div className="mt-5 space-y-2 rounded-2xl border border-[#EAE8E2] bg-white p-5 text-sm leading-relaxed">
              <p className="flex justify-between gap-4">
                <span className="text-[#777777]">{t.deliveryInside}</span>
                <span className="font-semibold">
                  {shop.delivery_inside_charge > 0
                    ? formatBDT(shop.delivery_inside_charge)
                    : t.freeDelivery}
                </span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-[#777777]">{t.deliveryOutside}</span>
                <span className="font-semibold">
                  {shop.delivery_outside_charge > 0
                    ? formatBDT(shop.delivery_outside_charge)
                    : t.freeDelivery}
                </span>
              </p>
              {shop.free_delivery_threshold !== null &&
              shop.free_delivery_threshold > 0 ? (
                <p className="font-semibold text-[#1D7658]">
                  {t.freeDeliveryAbove(
                    formatBDT(shop.free_delivery_threshold),
                  )}
                </p>
              ) : null}
              <p className="border-t border-[#EAE8E2] pt-3 text-[#555555]">
                {L(
                  'রিটার্ন বা বিনিময় সম্পর্কে জানতে নিচের WhatsApp বাটনে যোগাযোগ করুন।',
                  'For returns or exchanges, contact us on WhatsApp below.',
                )}
              </p>
            </div>
          </section>

          {showFaq ? (
            <section id="faq" className="mt-12">
              <p className="text-xs font-bold uppercase tracking-wide text-[#1D7658]">
                {L('জিজ্ঞাসা', 'FAQ')}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold">{t.faq}</h2>
              <div className="mt-5 space-y-2">
                {page.faqs.map((f, i) => {
                  const open = fashionOpenFaq === i
                  return (
                    <div
                      key={i}
                      className="overflow-hidden rounded-2xl border border-[#EAE8E2] bg-white"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setFashionOpenFaq(open ? null : i)
                        }
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                        aria-expanded={open}
                      >
                        <span className="text-sm font-semibold">{f.q}</span>
                        <span className="shrink-0 text-lg text-[#1D7658]">
                          {open ? '−' : '+'}
                        </span>
                      </button>
                      {open ? (
                        <p className="border-t border-[#EAE8E2] px-4 py-3 text-sm leading-relaxed text-[#555555]">
                          {f.a}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
        </main>
        {footer}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 md:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[#EAE8E2] bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs text-[#777777]">{product.name}</p>
            <p className="text-lg font-extrabold">
              {formatBDT(product.price)}
            </p>
          </div>
          <a
            href="#order"
            className="shrink-0 rounded-full bg-[#1D7658] px-5 py-2.5 text-sm font-bold text-white"
          >
            {L('এখনই অর্ডার করুন', 'Order Now')}
          </a>
        </div>
      </div>
    )
  }

  // Beauty & Cosmetics (light, soft pink) — Template 04
  // প্যালেট: bg #FFF9F7, surface #FFFFFF, accent #D86F91, soft #FCECEF,
  // text #30252A, secondary #887A80, border #F1E4E7।
  // মডেলে নেই বলে নেই: উপাদান/ব্যবহারবিধি সেকশন, ভেরিয়েন্ট/সাইজ —
  // benefits/specs/বিবরণ/ছবি/রিভিউ/FAQ-ই আসল ডাটা। দাবি শুধু সেলারের
  // দেওয়া benefits থেকে — নিজে থেকে কোনো স্কিনকেয়ার দাবি বানানো হয় না।
  if (page.template === 'beauty-cosmetics') {
    const L = (bn: string, en: string) =>
      page.page_lang === 'en' ? en : bn
    const specEntries = Object.entries(product.specs)
    const showBenefits =
      page.sections['benefits'] !== false && product.benefits.length > 0
    const showSpecs =
      page.sections['specs'] !== false && specEntries.length > 0
    const videos = pageVideos(page)
    const showVideo =
      page.sections['video'] !== false &&
      videos.some((v) => youtubeEmbedId(v.url))
    const showReviews = page.sections['reviews'] !== false
    const showFaq =
      page.sections['faq'] !== false && page.faqs.length > 0
    const extraImages = images.slice(1)
    const storyImage = extraImages.length > 0 ? extraImages[0] : null

    const beautyAnnouncement =
      discount > 0 ? (
        <div className="bg-[#D86F91] px-4 py-2 text-center text-sm font-semibold text-white">
          {t.discountRunning(discount)}
        </div>
      ) : shop.free_delivery_threshold !== null &&
        shop.free_delivery_threshold > 0 ? (
        <div className="bg-[#FCECEF] px-4 py-2 text-center text-sm font-semibold text-[#D86F91]">
          {t.freeDeliveryAbove(formatBDT(shop.free_delivery_threshold))}
        </div>
      ) : null

    return (
      <div className="min-h-screen bg-[#FFF9F7] text-[#30252A]">
        {beautyAnnouncement}
        {/* ০২ বিউটি স্টোর হেডার */}
        <header className="relative border-b border-[#F1E4E7] bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-[#FCECEF]"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D86F91] text-base font-extrabold text-white">
                  {shop.name.charAt(0)}
                </span>
              )}
              <span className="text-base font-extrabold tracking-wide">
                {shop.name}
              </span>
            </span>
            <div className="flex items-center gap-1">
              <a
                href="#order"
                className="hidden rounded-full bg-[#D86F91] px-4 py-2 text-sm font-bold text-white sm:block"
              >
                {L('এখনই অর্ডার করুন', 'Order Now')}
              </a>
              <button
                type="button"
                onClick={() => setBeautyMenuOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[#30252A]"
                aria-label="মেনু"
                aria-expanded={beautyMenuOpen}
              >
                ☰
              </button>
            </div>
          </div>
          {beautyMenuOpen ? (
            <nav className="absolute inset-x-4 top-full z-50 rounded-2xl border border-[#F1E4E7] bg-white p-2 shadow-lg">
              {[
                { href: '#order', label: L('এখনই অর্ডার করুন', 'Order Now') },
                { href: '#reviews', label: L('কাস্টমার রিভিউ', 'Customer Reviews') },
                { href: '#delivery', label: L('ডেলিভারি ও কেয়ার', 'Delivery & Care') },
                { href: '#faq', label: L('জিজ্ঞাসা', 'FAQ') },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setBeautyMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#30252A] hover:bg-[#FFF9F7]"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          ) : null}
        </header>

        <main className="mx-auto max-w-5xl px-4 pt-6 lg:max-w-6xl">
          {/* ০৩ হিরো + ০৪ গ্যালারি */}
          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            <div>
              {showGallery ? (
                <Gallery images={images} productName={product.name} />
              ) : null}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D86F91]">
                {L('বিউটি কালেকশন', 'Beauty Collection')}
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold leading-tight md:text-4xl">
                {product.name}
              </h1>
              {product.category ? (
                <p className="mt-1 text-xs font-bold text-[#887A80]">
                  {product.category}
                </p>
              ) : null}
              <div className="mt-3">
                <RatingSummary data={data} t={t} />
              </div>
              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-extrabold">
                  {formatBDT(product.price)}
                </span>
                {product.old_price && product.old_price > product.price ? (
                  <>
                    <span className="text-lg text-[#887A80] line-through">
                      {formatBDT(product.old_price)}
                    </span>
                    <span className="rounded-full bg-[#D86F91] px-2.5 py-0.5 text-xs font-bold text-white">
                      {toBnDigits(discount)}% {L('ছাড়', 'OFF')}
                    </span>
                  </>
                ) : null}
              </div>
              {heroCopy ? (
                <p className="mt-4 text-[15px] leading-relaxed text-[#5c4a52]">
                  {heroCopy}
                </p>
              ) : null}
              <a
                href="#order"
                className="mt-6 block rounded-full bg-[#D86F91] px-4 py-3.5 text-center font-bold text-white shadow-sm"
              >
                {L('এখনই অর্ডার করুন', 'Order Now')}
              </a>
              <p className="mt-3 text-center text-xs text-[#887A80]">
                {t.deliveryInside}:{' '}
                {shop.delivery_inside_charge > 0
                  ? formatBDT(shop.delivery_inside_charge)
                  : t.freeDelivery}
                {' · '}
                {t.deliveryOutside}:{' '}
                {shop.delivery_outside_charge > 0
                  ? formatBDT(shop.delivery_outside_charge)
                  : t.freeDelivery}
              </p>
            </div>
          </div>

          {/* ০৫ পণ্যের উপকারিতা — শুধু সেলারের দেওয়া benefits থেকে */}
          {showBenefits ? (
            <section className="mt-12">
              <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-[#D86F91]">
                {L('উপকারিতা', 'Benefits')}
              </p>
              <h2 className="mt-1 text-center font-serif text-2xl font-bold">
                {L('কেন পছন্দ করবেন', 'Why You Will Love It')}
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {product.benefits.map((b, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-[#F1E4E7] bg-white p-4"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FCECEF] text-base text-[#D86F91]">
                      ✿
                    </span>
                    <p className="mt-3 text-sm font-semibold leading-relaxed">
                      {b}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* ০৮ কেন এই পণ্যটি বেছে নেবেন — বিবরণ + benefits, এডিটোরিয়াল ভঙ্গিতে */}
          {product.description ? (
            <section className="mt-12 overflow-hidden rounded-3xl border border-[#F1E4E7] bg-white">
              {storyImage ? (
                <FramedPhoto src={storyImage.url} alt={product.name} />
              ) : null}
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D86F91]">
                  {L('আমাদের গল্প', 'Our Story')}
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold">
                  {L('কেন এই পণ্যটি বেছে নেবেন?', 'Why Choose This Product?')}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-[#5c4a52]">
                  {product.description}
                </p>
                {showBenefits ? (
                  <ul className="mt-4 space-y-2">
                    {product.benefits.map((b, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="font-bold text-[#D86F91]">✓</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* ০৯ পণ্যের বিবরণ — সেলারের দেওয়া specs টেবিল */}
          {showSpecs ? (
            <section className="mt-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D86F91]">
                {L('বিস্তারিত', 'Details')}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold">
                {L('পণ্যের বিবরণ', 'Product Details')}
              </h2>
              <dl className="mt-5 divide-y divide-[#F1E4E7] overflow-hidden rounded-2xl border border-[#F1E4E7] bg-white">
                {specEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <dt className="text-[#887A80]">{key}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {/* ১০ লাইফস্টাইল ফটোগ্রাফি — পণ্যের আসল অতিরিক্ত ছবি */}
          {extraImages.length > 0 && showGallery ? (
            <section className="mt-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D86F91]">
                {L('লাইফস্টাইল', 'Lifestyle')}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold">
                {L('ব্যবহারে দেখুন', 'See It In Use')}
              </h2>
              <div className="mt-5 space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {extraImages.map((img) => (
                  <FramedPhoto key={img.id} src={img.url} alt={product.name} />
                ))}
              </div>
            </section>
          ) : null}

          {/* ১২ বিশেষ অফার — শুধু আসল ছাড় থাকলে, কাউন্টডাউন নেই */}
          {discount > 0 ? (
            <section className="mt-12 rounded-3xl bg-gradient-to-br from-[#D86F91] to-[#EBC5D1] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/85">
                {L('বিশেষ অফার', 'Special Offer')}
              </p>
              <p className="mt-2 font-serif text-3xl font-bold">
                {toBnDigits(discount)}% {L('ছাড়', 'OFF')}
              </p>
              <p className="mt-2 text-sm text-white/90">
                {L(
                  'এখন অর্ডার করলেই ছাড়ের দামে পাচ্ছেন',
                  'Order now at the discounted price',
                )}
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold">
                  {formatBDT(product.price)}
                </span>
                {product.old_price ? (
                  <span className="text-white/75 line-through">
                    {formatBDT(product.old_price)}
                  </span>
                ) : null}
              </div>
              <a
                href="#order"
                className="mt-5 block rounded-full bg-white px-4 py-3 text-center font-bold text-[#D86F91]"
              >
                {L('এখনই অর্ডার করুন', 'Order Now')}
              </a>
            </section>
          ) : null}

          {showVideo ? (
            <section className="mt-12">
              <h2 className="font-serif text-2xl font-bold">{t.video}</h2>
              <VideoPlayer
                videos={videos}
                productName={product.name}
                frameClass="mt-4 aspect-video w-full overflow-hidden rounded-2xl"
                thumbActiveClass="border-[#D86F91]"
              />
            </section>
          ) : null}

          {/* ১১ কাস্টমার রিভিউ — শুধু আসল রিভিউ */}
          {showReviews ? (
            <section id="reviews" className="mt-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D86F91]">
                {L('মতামত', 'Reviews')}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold">
                {t.reviews}
              </h2>
              {page.reviews.length === 0 ? (
                <p className="mt-4 text-sm text-[#887A80]">{t.noReviews}</p>
              ) : (
                <div className="mt-5">
                  <RatingSummary data={data} t={t} />
                  <div className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  {page.reviews.map((r, i) => (
                    <article
                      key={i}
                      className="rounded-2xl border border-[#F1E4E7] bg-white p-4"
                    >
                      <div className="flex items-center gap-3">
                        <ReviewAvatar photoUrl={r.photo_url} name={r.name} />
                        <div>
                          <p className="font-semibold">{r.name}</p>
                          {typeof r.rating === 'number' && r.rating > 0 ? (
                            <p className="text-sm font-bold text-amber-500">
                              {'★'.repeat(Math.round(r.rating))}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#5c4a52]">
                        {r.text}
                      </p>
                      {r.screenshot_url ? (
                        <ReviewScreenshot
                          url={r.screenshot_url}
                          alt={`${r.name} — রিভিউর স্ক্রিনশট`}
                        />
                      ) : null}
                    </article>
                  ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* ১৩ অর্ডার ফর্ম — আসল ফর্ম, গোলাপি CTA */}
          <div className="mt-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D86F91]">
              {L('অর্ডার করুন', 'Place Your Order')}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold">
              {L('অর্ডার ফর্ম', 'Order Form')}
            </h2>
            <div className="mt-4">
              <OrderSection
                data={data}
                t={t}
                placed={placed}
                preview={preview}
                onPlaced={setPlaced}
                onOrderAgain={() => setPlaced(null)}
                accent="#D86F91"
                accentText="#FFFFFF"
                lightAccent="#D86F91"
              />
            </div>
          </div>

          {/* ১৪ ডেলিভারি ও কাস্টমার কেয়ার — দোকানের আসল চার্জ থেকে */}
          <section id="delivery" className="mt-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D86F91]">
              {L('ডেলিভারি', 'Delivery')}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold">
              {L('ডেলিভারি ও কাস্টমার কেয়ার', 'Delivery & Customer Care')}
            </h2>
            <div className="mt-5 space-y-2 rounded-2xl border border-[#F1E4E7] bg-white p-5 text-sm leading-relaxed">
              <p className="flex justify-between gap-4">
                <span className="text-[#887A80]">{t.deliveryInside}</span>
                <span className="font-semibold">
                  {shop.delivery_inside_charge > 0
                    ? formatBDT(shop.delivery_inside_charge)
                    : t.freeDelivery}
                </span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-[#887A80]">{t.deliveryOutside}</span>
                <span className="font-semibold">
                  {shop.delivery_outside_charge > 0
                    ? formatBDT(shop.delivery_outside_charge)
                    : t.freeDelivery}
                </span>
              </p>
              {shop.free_delivery_threshold !== null &&
              shop.free_delivery_threshold > 0 ? (
                <p className="font-semibold text-[#D86F91]">
                  {t.freeDeliveryAbove(
                    formatBDT(shop.free_delivery_threshold),
                  )}
                </p>
              ) : null}
              <p className="border-t border-[#F1E4E7] pt-3 text-[#5c4a52]">
                {L(
                  'পেমেন্ট, রিটার্ন বা যেকোনো প্রশ্নে নিচের WhatsApp বাটনে যোগাযোগ করুন।',
                  'For payment, returns or any question, contact us on WhatsApp below.',
                )}
              </p>
            </div>
          </section>

          {/* ১৫ জিজ্ঞাসা — অ্যাকর্ডিয়ন */}
          {showFaq ? (
            <section id="faq" className="mt-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D86F91]">
                {L('জিজ্ঞাসা', 'FAQ')}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold">{t.faq}</h2>
              <div className="mt-5 space-y-2">
                {page.faqs.map((f, i) => (
                  <details
                    key={i}
                    className="rounded-2xl border border-[#F1E4E7] bg-white px-4 py-3"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                      {f.q}
                      <span className="shrink-0 text-lg text-[#D86F91]">+</span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-[#5c4a52]">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </main>
        <ContactCard data={data} dark={false} />
        <footer className="mt-10 border-t border-[#F1E4E7] bg-[#FCECEF] px-4 py-8 text-center">
          <a
            href="/"
            className="inline-block font-serif text-xl font-bold"
            aria-label="Orderlink — হোম পেজ"
          >
            <span className="text-[#D86F91]">Order</span>
            <span className="text-[#30252A]">link</span>
          </a>
          <p className="mt-2 text-sm font-semibold">{shop.name}</p>
          {sellerWhatsapp ? (
            <a
              href={`https://wa.me/${sellerWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-full border border-[#EBC5D1] bg-white px-4 py-2 text-xs font-semibold text-[#D86F91]"
            >
              WhatsApp-এ যোগাযোগ করুন
            </a>
          ) : null}
          <p className="mt-4 text-xs text-[#887A80]">
            © {toBnDigits(new Date().getFullYear())} {shop.name}
          </p>
        </footer>
        {/* স্টিকি অর্ডার বার — শুধু মোবাইলে */}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 md:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[#F1E4E7] bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs text-[#887A80]">{product.name}</p>
            <p className="text-lg font-extrabold">
              {formatBDT(product.price)}
            </p>
          </div>
          <a
            href="#order"
            className="shrink-0 rounded-full bg-[#D86F91] px-5 py-2.5 text-sm font-bold text-white"
          >
            {L('এখনই অর্ডার করুন', 'Order Now')}
          </a>
        </div>
      </div>
    )
  }

  // ---- Tech & Gadget (Template 03) — গাঢ় নেভি-সায়ান ফিউচারিস্টিক থিম ----
  // ব্রিফের ১৬ সেকশন: ঘোষণা, হেডার, হিরো, গ্যালারি, মূল ফিচার, অভিজ্ঞতা,
  // ফিচার ব্রেকডাউন, স্পেসিফিকেশন, তুলনা, বক্সে যা আছে, রিভিউ, অফার,
  // অর্ডার ফর্ম, ওয়ারেন্টি ও ডেলিভারি, FAQ, ফুটার। মডেলে নেই বলে তুলনা ও
  // বক্স-কনটেন্ট সেকশন নেই; মডেল/রং ভেরিয়েন্টও নেই — ফর্মে নেই।
  // ফিচার = আসল benefits, স্পেসিফিকেশন = আসল specs, রিভিউ শুধু আসল।
  if (page.template === 'tech-gadget') {
    const L = (bn: string, en: string) =>
      page.page_lang === 'en' ? en : bn
    const specEntries = Object.entries(product.specs)
    const showBenefits =
      page.sections['benefits'] !== false && product.benefits.length > 0
    const showSpecs =
      page.sections['specs'] !== false && specEntries.length > 0
    const videos = pageVideos(page)
    const showVideo =
      page.sections['video'] !== false &&
      videos.some((v) => youtubeEmbedId(v.url))
    const showReviews = page.sections['reviews'] !== false
    const showFaq =
      page.sections['faq'] !== false && page.faqs.length > 0
    const freeThreshold =
      shop.free_delivery_threshold !== null &&
      shop.free_delivery_threshold > 0
        ? Number(shop.free_delivery_threshold)
        : null
    const techRated = page.reviews.filter(
      (r) => typeof r.rating === 'number' && r.rating > 0,
    )
    const techAvg =
      techRated.length > 0
        ? techRated.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
          techRated.length
        : 0
    // ওয়ারেন্টি আলাদা ফিল্ড নেই — সেলার specs-এ লিখলে সেটাই দেখায়।
    const warrantyEntry = specEntries.find(([key]) =>
      /warranty|ওয়ারেন্টি|গ্যারান্টি/i.test(key),
    )
    const highlightSpecs = specEntries.slice(0, 3)
    const experienceImage =
      images.length > 1 ? images[1] : images.length > 0 ? images[0] : null
    const techGlyphs = ['⚡', '◆', '◐', '⌁']
    const techEyebrow =
      'text-[11px] font-bold uppercase tracking-[0.25em] text-[#19C8F0]'
    const techH2 = 'text-2xl font-bold text-white'
    const techTrust = [
      {
        glyph: '✦',
        title: L('অরিজিনাল পণ্য', 'Authentic Product'),
        desc: L('১০০% আসল পণ্যের নিশ্চয়তা', '100% genuine product guaranteed'),
      },
      {
        glyph: '◆',
        title: L('প্রিমিয়াম কোয়ালিটি', 'Premium Quality'),
        desc: L('যাচাই করা মান ও নিখুঁত ফিনিশিং', 'Checked quality and fine finishing'),
      },
      {
        glyph: '✓',
        title: L('নিরাপদ অর্ডার', 'Secure Ordering'),
        desc: L('সহজ ও নিরাপদ অর্ডার প্রক্রিয়া', 'Simple and secure ordering'),
      },
      {
        glyph: '➤',
        title: L('দ্রুত ডেলিভারি', 'Fast Delivery'),
        desc: L('সারা দেশে দ্রুত ডেলিভারি', 'Fast delivery across the country'),
      },
    ]
    const techAnnouncement =
      discount > 0 ? (
        <div className="bg-[#19C8F0] px-4 py-2 text-center text-sm font-bold text-[#080D18]">
          {t.discountRunning(discount)}
        </div>
      ) : freeThreshold ? (
        <div className="bg-[#101A2B] px-4 py-2 text-center text-sm font-semibold text-[#19C8F0]">
          {t.freeDeliveryAbove(formatBDT(freeThreshold))}
        </div>
      ) : null
    return (
      <div className="min-h-screen bg-[#080D18] text-white">
        {techAnnouncement}
        {/* ০২ দোকানের হেডার — মেনুতে আসল অ্যাঙ্কর লিংক (কার্ট নেই) */}
        <header className="relative border-b border-[#283A54] bg-[#080D18]">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-full border border-[#283A54] object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#19C8F0] text-base font-extrabold text-[#080D18]">
                  {shop.name.charAt(0)}
                </span>
              )}
              <span className="text-base font-extrabold tracking-wide text-white">
                {shop.name}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setTechMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-white"
              aria-label="মেনু"
              aria-expanded={techMenuOpen}
            >
              ☰
            </button>
          </div>
          {techMenuOpen ? (
            <nav className="absolute inset-x-4 top-full z-50 rounded-2xl border border-[#283A54] bg-[#101A2B] p-2 shadow-lg">
              {[
                { href: '#order', label: L('এখনই অর্ডার করুন', 'Order Now') },
                { href: '#specs', label: t.specs },
                { href: '#reviews', label: t.reviews },
                { href: '#delivery', label: L('ওয়ারেন্টি ও ডেলিভারি', 'Warranty & Delivery') },
                { href: '#faq', label: t.faq },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setTechMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-white hover:bg-[#17243A]"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          ) : null}
        </header>

        <main className="mx-auto max-w-5xl px-4 pt-6 lg:max-w-6xl">
          {/* ০৩ হিরো + ০৪ গ্যালারি */}
          <div className="grid gap-6 md:grid-cols-2 md:items-start">
            <div>
              {showGallery ? (
                <Gallery
                  images={images}
                  productName={product.name}
                  thumbActiveClass="border-[#19C8F0]"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-[#283A54] bg-[#101A2B] text-[#A8B5C8]">
                  ছবি যোগ করা হয়নি
                </div>
              )}
            </div>
            <div>
              <p className={techEyebrow}>{L('টেক ও গ্যাজেট', 'Tech & Gadget')}</p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-white md:text-4xl">
                {product.name}
              </h1>
              {product.category ? (
                <p className="mt-1 text-xs font-bold text-[#A8B5C8]">
                  {product.category}
                </p>
              ) : null}
              {techRated.length > 0 ? (
                <p className="mt-2 text-sm text-[#A8B5C8]">
                  <span className="font-bold text-amber-400">
                    {'★'.repeat(Math.round(techAvg))}
                  </span>{' '}
                  {toBnDigits(String(Math.round(techAvg * 10) / 10))} ·{' '}
                  {t.basedOnReviews(techRated.length)}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#19C8F0]">
                  {formatBDT(product.price)}
                </span>
                {product.old_price && product.old_price > product.price ? (
                  <>
                    <span className="text-lg text-[#A8B5C8] line-through">
                      {formatBDT(product.old_price)}
                    </span>
                    <span className="rounded-full bg-[#19C8F0] px-2.5 py-0.5 text-xs font-bold text-[#080D18]">
                      {toBnDigits(discount)}% {t.off}
                    </span>
                  </>
                ) : null}
              </div>
              {heroCopy ? (
                <p className="mt-4 text-sm leading-relaxed text-[#A8B5C8]">
                  {heroCopy}
                </p>
              ) : null}
              <a
                href="#order"
                className="mt-6 block rounded-xl bg-gradient-to-r from-[#19C8F0] to-[#477BFF] px-4 py-3.5 text-center font-bold text-white shadow-[0_0_28px_rgba(25,200,240,0.35)]"
              >
                {t.orderNow}
              </a>
              <p className="mt-3 text-center text-xs text-[#A8B5C8]">
                {t.deliveryInside}:{' '}
                {shop.delivery_inside_charge > 0
                  ? formatBDT(shop.delivery_inside_charge)
                  : t.freeDelivery}
                {' · '}
                {t.deliveryOutside}:{' '}
                {shop.delivery_outside_charge > 0
                  ? formatBDT(shop.delivery_outside_charge)
                  : t.freeDelivery}
              </p>
            </div>
          </div>

          {/* ০৫ আস্থার নিশ্চয়তা */}
          <section className="mt-12">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {techTrust.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#283A54] bg-[#17243A] p-4"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#19C8F0]/60 text-base text-[#19C8F0]">
                    {item.glyph}
                  </span>
                  <p className="mt-3 text-sm font-bold text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#A8B5C8]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ০৫ মূল টেক ফিচার — আসল benefits */}
          {showBenefits ? (
            <section className="mt-12">
              <p className={techEyebrow}>{L('মূল ফিচার', 'Key Features')}</p>
              <h2 className={`${techH2} mt-1`}>
                {L('যে ফিচারগুলো আলাদা করে', 'What Sets It Apart')}
              </h2>
              <span className="mt-3 block h-px w-12 bg-[#19C8F0]" />
              <div className="mt-5 grid grid-cols-2 gap-3">
                {product.benefits.map((b, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-[#283A54] bg-[#17243A] p-4"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#19C8F0]/15 text-lg text-[#19C8F0]">
                      {techGlyphs[i % techGlyphs.length]}
                    </span>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-white">
                      {b}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* ০৬ পণ্যের অভিজ্ঞতা — বিবরণ + বড় ছবি */}
          {product.description ? (
            <section className="mt-12">
              <p className={techEyebrow}>{L('অভিজ্ঞতা', 'Experience')}</p>
              <h2 className={`${techH2} mt-1`}>
                {L('দৈনন্দিন জীবনে যেভাবে কাজে আসে', 'How It Fits Your Everyday Life')}
              </h2>
              <span className="mt-3 block h-px w-12 bg-[#19C8F0]" />
              {experienceImage ? (
                <div className="mt-5">
                  <FramedPhoto src={experienceImage.url} alt={product.name} />
                </div>
              ) : null}
              <p className="mt-5 text-[15px] leading-relaxed text-[#C6D2E0]">
                {product.description}
              </p>
            </section>
          ) : null}

          {/* ০৭ ফিচার ব্রেকডাউন — benefits নম্বরসহ + হাইলাইট করা specs */}
          {showBenefits || showSpecs ? (
            <section className="mt-12">
              <p className={techEyebrow}>{L('বিস্তারিত', 'Breakdown')}</p>
              <h2 className={`${techH2} mt-1`}>
                {L('ফিচার ব্রেকডাউন', 'Feature Breakdown')}
              </h2>
              <span className="mt-3 block h-px w-12 bg-[#19C8F0]" />
              {showBenefits ? (
                <div className="mt-5 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                  {product.benefits.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 rounded-2xl border border-[#283A54] bg-[#17243A] p-4"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#19C8F0] to-[#477BFF] text-base font-extrabold text-white">
                        {toBnDigits(i + 1)}
                      </span>
                      <p className="pt-2 text-sm font-semibold leading-relaxed text-white">
                        {b}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              {highlightSpecs.length > 0 ? (
                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {highlightSpecs.map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-2xl border border-[#283A54] bg-[#101A2B] p-3 text-center"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#19C8F0]">
                        {key}
                      </p>
                      <p className="mt-1 text-sm font-bold leading-snug text-white">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {/* ০৮ টেকনিক্যাল স্পেসিফিকেশন */}
          {showSpecs ? (
            <section id="specs" className="mt-12">
              <p className={techEyebrow}>{L('টেকনিক্যাল', 'Technical')}</p>
              <h2 className={`${techH2} mt-1`}>{t.specs}</h2>
              <span className="mt-3 block h-px w-12 bg-[#19C8F0]" />
              <dl className="mt-5 divide-y divide-[#283A54] overflow-hidden rounded-2xl border border-[#283A54]">
                {specEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 bg-[#17243A] px-4 py-3 text-sm"
                  >
                    <dt className="text-[#A8B5C8]">{key}</dt>
                    <dd className="text-right font-medium text-white">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {/* ভিডিও — বিল্ডারে চালু থাকলে ও লিংক থাকলে */}
          {showVideo ? (
            <section className="mt-12">
              <h2 className={techH2}>{t.video}</h2>
              <span className="mt-3 block h-px w-12 bg-[#19C8F0]" />
              <VideoPlayer
                videos={videos}
                productName={product.name}
                frameClass="mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-[#283A54]"
                thumbActiveClass="border-[#19C8F0]"
              />
            </section>
          ) : null}

          {/* ১১ কাস্টমার রিভিউ — শুধু আসল রিভিউ */}
          {showReviews ? (
            <section id="reviews" className="mt-12">
              <p className={techEyebrow}>{L('মতামত', 'Reviews')}</p>
              <h2 className={`${techH2} mt-1`}>{t.reviews}</h2>
              <span className="mt-3 block h-px w-12 bg-[#19C8F0]" />
              {page.reviews.length === 0 ? (
                <p className="mt-4 text-sm text-[#A8B5C8]">{t.noReviews}</p>
              ) : (
                <div className="mt-5">
                  {techRated.length > 0 ? (
                    <p className="text-sm text-[#A8B5C8]">
                      <span className="font-bold text-amber-400">
                        {'★'.repeat(Math.round(techAvg))}
                      </span>{' '}
                      {toBnDigits(String(Math.round(techAvg * 10) / 10))} ·{' '}
                      {t.basedOnReviews(techRated.length)}
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  {page.reviews.map((r, i) => (
                    <article
                      key={i}
                      className="rounded-2xl border border-[#283A54] bg-[#17243A] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <ReviewAvatar photoUrl={r.photo_url} name={r.name} />
                        <div>
                          <p className="font-semibold text-white">{r.name}</p>
                          {typeof r.rating === 'number' && r.rating > 0 ? (
                            <p className="text-sm font-bold text-amber-400">
                              {'★'.repeat(Math.round(r.rating))}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#A8B5C8]">
                        {r.text}
                      </p>
                      {r.screenshot_url ? (
                        <ReviewScreenshot
                          url={r.screenshot_url}
                          alt={`${r.name} — রিভিউর স্ক্রিনশট`}
                        />
                      ) : null}
                    </article>
                  ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* ১২ বিশেষ অফার — শুধু আসল ছাড় থাকলে */}
          {discount > 0 ? (
            <section className="mt-12 rounded-2xl border border-[#19C8F0]/50 bg-gradient-to-b from-[#17243A] to-[#101A2B] p-6 text-center">
              <p className={techEyebrow}>{L('বিশেষ অফার', 'Special Offer')}</p>
              <p className="mt-3 text-4xl font-extrabold text-[#19C8F0]">
                {toBnDigits(discount)}% {t.off}
              </p>
              <p className="mt-2 text-sm text-[#A8B5C8]">
                {t.discountRunning(discount)}
              </p>
              <div className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-2xl font-extrabold text-white">
                  {formatBDT(product.price)}
                </span>
                {product.old_price && product.old_price > product.price ? (
                  <span className="text-base text-[#A8B5C8] line-through">
                    {formatBDT(product.old_price)}
                  </span>
                ) : null}
              </div>
              <a
                href="#order"
                className="mt-5 block rounded-xl bg-gradient-to-r from-[#19C8F0] to-[#477BFF] px-4 py-3.5 font-bold text-white shadow-[0_0_28px_rgba(25,200,240,0.35)]"
              >
                {t.orderNow}
              </a>
            </section>
          ) : null}

          {/* ১৩ অর্ডার ফর্ম — আসল ফর্ম, সায়ান CTA */}
          <div className="mt-12">
            <OrderSection
              data={data}
              t={t}
              placed={placed}
              preview={preview}
              onPlaced={setPlaced}
              onOrderAgain={() => setPlaced(null)}
              dark
              accent="#19C8F0"
              accentText="#080D18"
            />
          </div>

          {/* ১৪ ওয়ারেন্টি ও ডেলিভারি — আসল চার্জ; ওয়ারেন্টি শুধু specs-এ থাকলে */}
          <section
            id="delivery"
            className="mt-12 rounded-2xl border border-[#283A54] bg-[#17243A] p-5"
          >
            <p className={techEyebrow}>{L('সাপোর্ট', 'Support')}</p>
            <h2 className={`${techH2} mt-1`}>
              {L('ওয়ারেন্টি ও ডেলিভারি', 'Warranty & Delivery')}
            </h2>
            <span className="mt-3 block h-px w-12 bg-[#19C8F0]" />
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex justify-between gap-4">
                <span className="text-[#A8B5C8]">{t.deliveryInside}</span>
                <span className="font-semibold text-white">
                  {shop.delivery_inside_charge > 0
                    ? formatBDT(shop.delivery_inside_charge)
                    : t.freeDelivery}
                </span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-[#A8B5C8]">{t.deliveryOutside}</span>
                <span className="font-semibold text-white">
                  {shop.delivery_outside_charge > 0
                    ? formatBDT(shop.delivery_outside_charge)
                    : t.freeDelivery}
                </span>
              </p>
              {warrantyEntry ? (
                <p className="flex justify-between gap-4">
                  <span className="text-[#A8B5C8]">{warrantyEntry[0]}</span>
                  <span className="text-right font-semibold text-white">
                    {warrantyEntry[1]}
                  </span>
                </p>
              ) : null}
              {freeThreshold ? (
                <p className="text-xs leading-relaxed text-[#19C8F0]">
                  {t.freeDeliveryAbove(formatBDT(freeThreshold))}
                </p>
              ) : null}
              <p className="border-t border-[#283A54] pt-3 text-xs leading-relaxed text-[#A8B5C8]">
                {warrantyEntry
                  ? t.luxuryDeliverySupport
                  : L(
                      'ওয়ারেন্টি সম্পর্কে জানতে নিচের WhatsApp বাটনে যোগাযোগ করুন।',
                      'For warranty details, contact us on WhatsApp below.',
                    )}
              </p>
            </div>
          </section>

          {/* ১৫ জিজ্ঞাসা — অ্যাকর্ডিয়ন */}
          {showFaq ? (
            <section id="faq" className="mt-12">
              <p className={techEyebrow}>{L('জিজ্ঞাসা', 'FAQ')}</p>
              <h2 className={`${techH2} mt-1`}>{t.faq}</h2>
              <span className="mt-3 block h-px w-12 bg-[#19C8F0]" />
              <div className="mt-5 space-y-2">
                {page.faqs.map((f, i) => {
                  const open = techOpenFaq === i
                  return (
                    <div
                      key={i}
                      className="overflow-hidden rounded-2xl border border-[#283A54] bg-[#17243A]"
                    >
                      <button
                        type="button"
                        onClick={() => setTechOpenFaq(open ? null : i)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                        aria-expanded={open}
                      >
                        <span className="text-sm font-semibold text-white">
                          {f.q}
                        </span>
                        <span className="shrink-0 text-lg text-[#19C8F0]">
                          {open ? '−' : '+'}
                        </span>
                      </button>
                      {open ? (
                        <p className="border-t border-[#283A54] px-4 py-3 text-sm leading-relaxed text-[#A8B5C8]">
                          {f.a}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
        </main>
        <ContactCard data={data} dark />
        <footer className="mt-10 border-t border-[#283A54] px-4 py-8 text-center">
          <a
            href="/"
            className="inline-block text-xl font-extrabold"
            aria-label="Orderlink — হোম পেজ"
          >
            <span className="text-[#19C8F0]">Order</span>
            <span className="text-white">link</span>
          </a>
          <p className="mt-2 text-sm font-semibold text-white">{shop.name}</p>
          {sellerWhatsapp ? (
            <a
              href={`https://wa.me/${sellerWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-full border border-[#283A54] px-4 py-2 text-xs font-semibold text-[#19C8F0]"
            >
              WhatsApp-এ যোগাযোগ করুন
            </a>
          ) : null}
          <p className="mt-4 text-xs text-[#A8B5C8]">
            © {toBnDigits(new Date().getFullYear())} {shop.name}
          </p>
        </footer>
        {/* স্টিকি অর্ডার বার — শুধু মোবাইলে, নিজের সায়ান রূপ */}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 md:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[#283A54] bg-[#101A2B]/95 px-4 py-3 shadow-lg backdrop-blur md:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs text-[#A8B5C8]">{product.name}</p>
            <p className="text-lg font-extrabold text-[#19C8F0]">
              {formatBDT(product.price)}
            </p>
          </div>
          <a
            href="#order"
            className="shrink-0 rounded-full bg-gradient-to-r from-[#19C8F0] to-[#477BFF] px-5 py-2.5 text-sm font-bold text-white"
          >
            {t.orderNow}
          </a>
        </div>
      </div>
    )
  }

  // ---- BD Single Product (Template 05) — বাংলাদেশি ফেসবুক সেলারের
  // ক্লাসিক সিঙ্গেল-প্রোডাক্ট ডাইরেক্ট-রেসপন্স পেজ: সাদা পটভূমি, লাল
  // দাম/অফার, সবুজ অর্ডার ও COD উপাদান, বড় ছবি, বড় ফর্ম। ভেরিয়েন্ট
  // মডেলে নেই — ফর্মে নেই। ছাড়/ফ্রি-ডেলিভারি শুধু আসল ডাটা থাকলে;
  // অফার শুধু আসল ছাড় থাকলে; রিভিউ শুধু আসল; কোনো কাউন্টডাউন,
  // ভুয়া স্টক বা ভুয়া দাবি নেই।
  if (page.template === 'bd-single-product') {
    const L = (bn: string, en: string) =>
      page.page_lang === 'en' ? en : bn
    const specEntries = Object.entries(product.specs)
    const showBenefits =
      page.sections['benefits'] !== false && product.benefits.length > 0
    const showSpecs =
      page.sections['specs'] !== false && specEntries.length > 0
    const videos = pageVideos(page)
    const showVideo =
      page.sections['video'] !== false &&
      videos.some((v) => youtubeEmbedId(v.url))
    const showReviews = page.sections['reviews'] !== false
    const showFaq =
      page.sections['faq'] !== false && page.faqs.length > 0
    const freeThreshold =
      shop.free_delivery_threshold !== null &&
      shop.free_delivery_threshold > 0
        ? Number(shop.free_delivery_threshold)
        : null
    const bdRated = page.reviews.filter(
      (r) => typeof r.rating === 'number' && r.rating > 0,
    )
    const bdAvg =
      bdRated.length > 0
        ? bdRated.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
          bdRated.length
        : 0
    const trustItems = [
      {
        glyph: '৳',
        title: L('ক্যাশ অন ডেলিভারি', 'Cash on Delivery'),
        desc: L('পণ্য হাতে পেয়ে টাকা দিন', 'Pay when you receive the product'),
      },
      {
        glyph: '✓',
        title: L('আসল পণ্য', 'Genuine Product'),
        desc: L('১০০% অরিজিনাল পণ্যের নিশ্চয়তা', '100% original product guaranteed'),
      },
      {
        glyph: '➤',
        title: L('সারা দেশে ডেলিভারি', 'Nationwide Delivery'),
        desc: L('ঢাকা ও ঢাকার বাইরে সব জেলায়', 'All districts, inside and outside Dhaka'),
      },
      {
        glyph: '◷',
        title: L('দ্রুত ডেলিভারি', 'Fast Delivery'),
        desc: L('অর্ডার কনফার্মের পর দ্রুত পাঠানো হয়', 'Dispatched quickly after confirmation'),
      },
    ]
    const bdH2 = 'text-2xl font-extrabold text-gray-900'
    const bdEyebrow =
      'text-xs font-extrabold uppercase tracking-[0.2em] text-[#E11D2E]'
    return (
      <div className="min-h-screen bg-white text-gray-900">
        {/* ০১ ঘোষণা বার — শুধু আসল ছাড় বা আসল ফ্রি-ডেলিভারি সীমা থাকলে */}
        {discount > 0 ? (
          <div className="bg-[#E11D2E] px-4 py-2.5 text-center text-sm font-extrabold text-white">
            {t.discountRunning(discount)} — {t.orderNow}!
          </div>
        ) : freeThreshold ? (
          <div className="bg-[#16A34A] px-4 py-2.5 text-center text-sm font-bold text-white">
            {t.freeDeliveryAbove(formatBDT(freeThreshold))}
          </div>
        ) : null}
        {/* ০২ দোকানের হেডার */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <span className="flex items-center gap-2 font-bold text-gray-900">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt=""
                className="h-9 w-9 rounded-full border border-gray-200 object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#16A34A] text-sm font-extrabold text-white">
                {shop.name.charAt(0)}
              </span>
            )}
            <span>{shop.name}</span>
          </span>
          {sellerWhatsapp ? (
            <a
              href={`https://wa.me/${sellerWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#16A34A] px-3 py-1.5 text-xs font-bold text-[#16A34A]"
            >
              WhatsApp
            </a>
          ) : (
            <span className="text-xs text-gray-500">{t.shopPage}</span>
          )}
        </header>
        <main className="mx-auto max-w-2xl px-4 pt-6 md:max-w-4xl lg:max-w-6xl">
          {/* ০৩ হিরো + ০৪ গ্যালারি */}
          <div className="grid gap-6 md:grid-cols-2 md:items-start">
            <div>
              {showGallery ? (
                <Gallery
                  images={images}
                  productName={product.name}
                  thumbActiveClass="border-[#E11D2E]"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-400">
                  ছবি যোগ করা হয়নি
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold leading-tight text-gray-900 md:text-4xl">
                {product.name}
              </h1>
              {product.category ? (
                <p className="mt-1 text-xs font-bold text-gray-500">
                  {product.category}
                </p>
              ) : null}
              {bdRated.length > 0 ? (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-bold text-amber-500">
                    {'★'.repeat(Math.round(bdAvg))}
                  </span>{' '}
                  {toBnDigits(String(Math.round(bdAvg * 10) / 10))} ·{' '}
                  {t.basedOnReviews(bdRated.length)}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#E11D2E]">
                  {formatBDT(product.price)}
                </span>
                {product.old_price && product.old_price > product.price ? (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      {formatBDT(product.old_price)}
                    </span>
                    <span className="rounded-full bg-[#E11D2E] px-2.5 py-0.5 text-xs font-extrabold text-white">
                      {toBnDigits(discount)}% {t.off}
                    </span>
                  </>
                ) : null}
              </div>
              {heroCopy ? (
                <p className="mt-4 text-[15px] leading-relaxed text-gray-700">
                  {heroCopy}
                </p>
              ) : null}
              <a
                href="#order"
                className="mt-6 block rounded-xl bg-[#E11D2E] px-4 py-4 text-center text-lg font-extrabold text-white shadow-sm"
              >
                {L('এখনই অর্ডার করুন', 'Order Now')}
              </a>
              <p className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-bold text-[#15803D]">
                ✓{' '}
                {L(
                  'ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন',
                  'Cash on Delivery — pay when you receive the product',
                )}
              </p>
              <p className="mt-3 text-center text-xs text-gray-500">
                {t.deliveryInside}:{' '}
                {shop.delivery_inside_charge > 0
                  ? formatBDT(shop.delivery_inside_charge)
                  : t.freeDelivery}
                {' · '}
                {t.deliveryOutside}:{' '}
                {shop.delivery_outside_charge > 0
                  ? formatBDT(shop.delivery_outside_charge)
                  : t.freeDelivery}
              </p>
            </div>
          </div>

          {/* ০৫ আস্থার নিশ্চয়তা */}
          <section className="mt-10">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {trustItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#16A34A] text-lg font-extrabold text-white">
                    {item.glyph}
                  </span>
                  <p className="mt-3 text-sm font-extrabold text-gray-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ০৬ কেন এই পণ্যটি কিনবেন — আসল benefits থাকলে */}
          {showBenefits ? (
            <section className="mt-12">
              <p className={bdEyebrow}>
                {L('কেন কিনবেন', 'Why Buy')}
              </p>
              <h2 className={`${bdH2} mt-1`}>
                {L('কেন এই পণ্যটি কিনবেন?', 'Why Buy This Product?')}
              </h2>
              <span className="mt-3 block h-1 w-12 rounded bg-[#E11D2E]" />
              <div className="mt-5 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {product.benefits.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-sm font-extrabold text-white">
                      {toBnDigits(i + 1)}
                    </span>
                    <span className="text-[15px] font-semibold leading-relaxed text-gray-800">
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* ০৭ পণ্যের বিবরণ ও স্পেসিফিকেশন — আসল ডাটা থাকলে */}
          {product.description || showSpecs ? (
            <section className="mt-12">
              <p className={bdEyebrow}>
                {L('বিস্তারিত', 'Details')}
              </p>
              <h2 className={`${bdH2} mt-1`}>
                {L('পণ্যের বিবরণ', 'Product Details')}
              </h2>
              <span className="mt-3 block h-1 w-12 rounded bg-[#E11D2E]" />
              {product.description ? (
                <p className="mt-5 text-[15px] leading-relaxed text-gray-700">
                  {product.description}
                </p>
              ) : null}
              {showSpecs ? (
                <dl className="mt-5 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200">
                  {specEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between gap-4 bg-white px-4 py-3 text-sm"
                    >
                      <dt className="text-gray-500">{key}</dt>
                      <dd className="text-right font-semibold text-gray-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </section>
          ) : null}

          {/* ভিডিও — বিল্ডারে চালু থাকলে ও লিংক থাকলে */}
          {showVideo ? (
            <section className="mt-12">
              <p className={bdEyebrow}>{L('ভিডিও', 'Video')}</p>
              <h2 className={`${bdH2} mt-1`}>{t.video}</h2>
              <span className="mt-3 block h-1 w-12 rounded bg-[#E11D2E]" />
              <VideoPlayer
                videos={videos}
                productName={product.name}
                frameClass="mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-gray-200"
                thumbActiveClass="border-[#E11D2E]"
              />
            </section>
          ) : null}

          {/* ০৮ কাস্টমার রিভিউ — শুধু আসল রিভিউ */}
          {showReviews ? (
            <section id="reviews" className="mt-12">
              <p className={bdEyebrow}>{L('রিভিউ', 'Reviews')}</p>
              <h2 className={`${bdH2} mt-1`}>{t.reviews}</h2>
              <span className="mt-3 block h-1 w-12 rounded bg-[#E11D2E]" />
              {page.reviews.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">{t.noReviews}</p>
              ) : (
                <div className="mt-5">
                  {bdRated.length > 0 ? (
                    <p className="text-sm text-gray-600">
                      <span className="font-bold text-amber-500">
                        {'★'.repeat(Math.round(bdAvg))}
                      </span>{' '}
                      {toBnDigits(String(Math.round(bdAvg * 10) / 10))} ·{' '}
                      {t.basedOnReviews(bdRated.length)}
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  {page.reviews.map((r, i) => (
                    <article
                      key={i}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <ReviewAvatar photoUrl={r.photo_url} name={r.name} />
                        <div>
                          <p className="font-bold text-gray-900">{r.name}</p>
                          {typeof r.rating === 'number' && r.rating > 0 ? (
                            <p className="text-sm font-bold text-amber-500">
                              {'★'.repeat(Math.round(r.rating))}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-700">
                        {r.text}
                      </p>
                      {r.screenshot_url ? (
                        <ReviewScreenshot
                          url={r.screenshot_url}
                          alt={`${r.name} — রিভিউর স্ক্রিনশট`}
                        />
                      ) : null}
                    </article>
                  ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* ০৯ বিশেষ অফার — শুধু আসল ছাড় থাকলে, কোনো কাউন্টডাউন নেই */}
          {discount > 0 ? (
            <section className="mt-12 rounded-2xl border-2 border-[#E11D2E] bg-[#FFF5F5] p-6 text-center">
              <p className={bdEyebrow}>
                {L('বিশেষ অফার', 'Special Offer')}
              </p>
              <p className="mt-3 text-5xl font-extrabold text-[#E11D2E]">
                {toBnDigits(discount)}% {t.off}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {t.discountRunning(discount)}
              </p>
              <div className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-3xl font-extrabold text-gray-900">
                  {formatBDT(product.price)}
                </span>
                {product.old_price && product.old_price > product.price ? (
                  <span className="text-lg text-gray-400 line-through">
                    {formatBDT(product.old_price)}
                  </span>
                ) : null}
              </div>
              <a
                href="#order"
                className="mt-5 block rounded-xl bg-[#16A34A] px-4 py-3.5 text-lg font-extrabold text-white"
              >
                {L('এখনই অর্ডার করুন', 'Order Now')}
              </a>
            </section>
          ) : null}

          {/* ১০ অর্ডার ফর্ম — আসল ফর্ম, সবুজ CTA */}
          <div className="mt-12">
            <p className={bdEyebrow}>
              {L('অর্ডার করুন', 'Place Your Order')}
            </p>
            <h2 className={`${bdH2} mt-1`}>
              {L('অর্ডার ফর্ম', 'Order Form')}
            </h2>
            <span className="mt-3 block h-1 w-12 rounded bg-[#E11D2E]" />
            <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-[#15803D]">
              ✓{' '}
              {L(
                'ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন',
                'Cash on Delivery — pay when you receive the product',
              )}
            </p>
            <div className="mt-4">
              <OrderSection
                data={data}
                t={t}
                placed={placed}
                preview={preview}
                onPlaced={setPlaced}
                onOrderAgain={() => setPlaced(null)}
                accent="#16A34A"
                accentText="#FFFFFF"
                lightAccent="#16A34A"
              />
            </div>
          </div>

          {/* ১১ ডেলিভারি ও পেমেন্ট — দোকানের আসল চার্জ থেকে */}
          <section id="delivery" className="mt-12">
            <p className={bdEyebrow}>{L('ডেলিভারি', 'Delivery')}</p>
            <h2 className={`${bdH2} mt-1`}>
              {L('ডেলিভারি ও পেমেন্ট', 'Delivery & Payment')}
            </h2>
            <span className="mt-3 block h-1 w-12 rounded bg-[#E11D2E]" />
            <div className="mt-5 space-y-2 rounded-2xl border border-gray-200 bg-white p-5 text-sm shadow-sm">
              <p className="flex justify-between gap-4">
                <span className="text-gray-500">{t.deliveryInside}</span>
                <span className="font-semibold text-gray-900">
                  {shop.delivery_inside_charge > 0
                    ? formatBDT(shop.delivery_inside_charge)
                    : t.freeDelivery}
                </span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-gray-500">{t.deliveryOutside}</span>
                <span className="font-semibold text-gray-900">
                  {shop.delivery_outside_charge > 0
                    ? formatBDT(shop.delivery_outside_charge)
                    : t.freeDelivery}
                </span>
              </p>
              {freeThreshold ? (
                <p className="font-semibold text-[#16A34A]">
                  {t.freeDeliveryAbove(formatBDT(freeThreshold))}
                </p>
              ) : null}
              <p className="border-t border-gray-200 pt-3 font-semibold text-[#15803D]">
                ✓{' '}
                {L(
                  'ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন',
                  'Cash on Delivery — pay when you receive the product',
                )}
              </p>
              <p className="text-xs leading-relaxed text-gray-500">
                {L(
                  'অর্ডার বা ডেলিভারি নিয়ে যেকোনো প্রশ্নে নিচের WhatsApp বাটনে যোগাযোগ করুন।',
                  'For any order or delivery question, contact us on WhatsApp below.',
                )}
              </p>
            </div>
          </section>

          {/* ১২ জিজ্ঞাসা — অ্যাকর্ডিয়ন */}
          {showFaq ? (
            <section id="faq" className="mt-12">
              <p className={bdEyebrow}>{L('জিজ্ঞাসা', 'FAQ')}</p>
              <h2 className={`${bdH2} mt-1`}>{t.faq}</h2>
              <span className="mt-3 block h-1 w-12 rounded bg-[#E11D2E]" />
              <div className="mt-5 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {page.faqs.map((f, i) => (
                  <details
                    key={i}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-gray-900">
                      {f.q}
                      <span className="shrink-0 text-lg text-[#E11D2E]">+</span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </main>
        <ContactCard data={data} dark={false} />
        <footer className="mt-10 border-t border-gray-200 bg-gray-50 px-4 py-8 text-center">
          <a
            href="/"
            className="inline-block text-xl font-extrabold"
            aria-label="Orderlink — হোম পেজ"
          >
            <span className="text-[#16A34A]">Order</span>
            <span className="text-[#E11D2E]">link</span>
          </a>
          <p className="mt-2 text-sm font-bold text-gray-900">{shop.name}</p>
          {sellerWhatsapp ? (
            <a
              href={`https://wa.me/${sellerWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-full border border-[#16A34A] px-4 py-2 text-xs font-bold text-[#16A34A]"
            >
              WhatsApp-এ যোগাযোগ করুন
            </a>
          ) : null}
          <p className="mt-4 text-xs text-gray-500">
            © {toBnDigits(new Date().getFullYear())} {shop.name}
          </p>
        </footer>
        {/* স্টিকি অর্ডার বার — শুধু মোবাইলে, নিজের সবুজ COD রূপ */}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 md:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-lg md:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-500">{product.name}</p>
            <p className="text-lg font-extrabold text-[#E11D2E]">
              {formatBDT(product.price)}
            </p>
          </div>
          <a
            href="#order"
            className="shrink-0 rounded-xl bg-[#16A34A] px-5 py-2.5 text-sm font-extrabold text-white"
          >
            {t.orderNow}
          </a>
        </div>
      </div>
    )
  }

  // Lavender Premium (Template 14) — নরম ল্যাভেন্ডার প্রিমিয়াম লুক।
  // ডেস্কটপে দুই কলামের চওড়া হিরো (ছবি বামে, তথ্য ডানে), মোবাইলে
  // স্ট্যাকড। নিজের মোবাইল স্টিকি বার (শেয়ার করা বার নয়)।
  if (page.template === 'lavender-premium') {
    const L = (bn: string, en: string) =>
      page.page_lang === 'en' ? en : bn
    const savings =
      product.old_price && product.old_price > product.price
        ? product.old_price - product.price
        : 0
    return (
      <div className="min-h-screen bg-[#F5F1FB] text-gray-900">
        {discount > 0 ? (
          <div className="bg-[#7C3AED] px-4 py-2 text-center text-sm font-semibold text-white">
            {t.discountRunning(discount)}
          </div>
        ) : null}
        <header className="border-b border-[#E9E2F7] bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7C3AED] text-base font-extrabold text-white">
                  {shop.name.charAt(0)}
                </span>
              )}
              <span className="text-base font-extrabold tracking-wide text-gray-900">
                {shop.name}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-gray-500 sm:block">
                {t.shopPage}
              </span>
              <a
                href="#order"
                className="hidden rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-bold text-white sm:block"
              >
                {t.orderNow}
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pt-6 lg:pt-10">
          <div className="rounded-3xl border border-[#E9E2F7] bg-white p-5 shadow-sm lg:p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <div>
                {showGallery ? (
                  <Gallery
                    images={images}
                    productName={product.name}
                    thumbActiveClass="border-[#7C3AED]"
                  />
                ) : null}
              </div>
              <div>
                {product.category ? (
                  <p className="inline-block rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-bold text-[#7C3AED]">
                    {product.category}
                  </p>
                ) : null}
                <h1 className="mt-3 text-2xl font-extrabold leading-snug text-gray-900 lg:text-4xl">
                  {product.name}
                </h1>
                <div className="mt-2">
                  <RatingSummary data={data} t={t} />
                </div>
                <div className="mt-3">
                  <PriceRow data={data} dark={false} />
                </div>
                {savings > 0 ? (
                  <p className="mt-2 inline-block rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-bold text-[#7C3AED]">
                    {L('সাশ্রয়', 'You save')}: {formatBDT(savings)}
                  </p>
                ) : null}
                {heroCopy ? (
                  <p className="mt-3 text-sm leading-relaxed text-gray-700 lg:text-base">
                    {heroCopy}
                  </p>
                ) : null}
                <a
                  href="#order"
                  className="mt-5 block rounded-xl bg-[#7C3AED] px-4 py-3.5 text-center font-bold text-white shadow-sm"
                >
                  {t.orderNow}
                </a>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-gray-600">
                  <span>✓ {L('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')}</span>
                  <span>
                    ✓ {L('সারা দেশে হোম ডেলিভারি', 'Home delivery across the country')}
                  </span>
                  <span>
                    ✓ {L('অর্ডার কনফার্ম করে পাঠানো হয়', 'Order confirmed before dispatch')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10">{sections}</div>
          {orderBox}
        </main>
        {footer}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 lg:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-lg lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-500">{product.name}</p>
            <p className="text-lg font-extrabold text-[#7C3AED]">
              {formatBDT(product.price)}
            </p>
          </div>
          <a
            href="#order"
            className="shrink-0 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-extrabold text-white"
          >
            {t.orderNow}
          </a>
        </div>
      </div>
    )
  }

  // Emerald Trust (Template 15) — পরিষ্কার সবুজ আস্থার লুক।
  // নরম সবুজ হিরো প্যানেলে দুই কলামের হিরো, ট্রাস্ট স্ট্রিপ,
  // মোবাইলে স্ট্যাকড + নিজের সবুজ স্টিকি বার।
  if (page.template === 'emerald-trust') {
    const L = (bn: string, en: string) =>
      page.page_lang === 'en' ? en : bn
    const savings =
      product.old_price && product.old_price > product.price
        ? product.old_price - product.price
        : 0
    return (
      <div className="min-h-screen bg-white text-gray-900">
        {discount > 0 ? (
          <div className="bg-[#047857] px-4 py-2 text-center text-sm font-semibold text-white">
            {t.discountRunning(discount)}
          </div>
        ) : null}
        <header className="border-b border-[#D1FAE5] bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#047857] text-base font-extrabold text-white">
                  {shop.name.charAt(0)}
                </span>
              )}
              <span className="text-base font-extrabold tracking-wide text-gray-900">
                {shop.name}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-gray-500 sm:block">
                {t.shopPage}
              </span>
              <a
                href="#order"
                className="hidden rounded-full bg-[#047857] px-4 py-2 text-sm font-bold text-white sm:block"
              >
                {t.orderNow}
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pt-6 lg:pt-10">
          <div className="rounded-3xl bg-[#ECFDF5] p-5 lg:p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <div>
                {showGallery ? (
                  <Gallery
                    images={images}
                    productName={product.name}
                    thumbActiveClass="border-[#047857]"
                  />
                ) : null}
              </div>
              <div>
                {product.category ? (
                  <p className="inline-block rounded-full bg-[#D1FAE5] px-3 py-1 text-xs font-bold text-[#047857]">
                    {product.category}
                  </p>
                ) : null}
                <h1 className="mt-3 text-2xl font-extrabold leading-snug text-gray-900 lg:text-4xl">
                  {product.name}
                </h1>
                <div className="mt-2">
                  <RatingSummary data={data} t={t} />
                </div>
                <div className="mt-3">
                  <PriceRow data={data} dark={false} />
                </div>
                {savings > 0 ? (
                  <p className="mt-2 inline-block rounded-full bg-[#D1FAE5] px-3 py-1 text-xs font-bold text-[#047857]">
                    {L('সাশ্রয়', 'You save')}: {formatBDT(savings)}
                  </p>
                ) : null}
                {heroCopy ? (
                  <p className="mt-3 text-sm leading-relaxed text-gray-700 lg:text-base">
                    {heroCopy}
                  </p>
                ) : null}
                <a
                  href="#order"
                  className="mt-5 block rounded-xl bg-[#047857] px-4 py-3.5 text-center font-bold text-white shadow-sm"
                >
                  {t.orderNow}
                </a>
                <div className="mt-4 rounded-2xl border border-[#A7F3D0] bg-white px-4 py-3">
                  <p className="text-xs font-bold text-[#065F46]">
                    {L('কেন আমাদের থেকে কিনবেন', 'Why buy from us')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-gray-700">
                    <span>✓ {L('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')}</span>
                    <span>
                      ✓ {L('সারা দেশে হোম ডেলিভারি', 'Home delivery across the country')}
                    </span>
                    <span>
                      ✓ {L('অর্ডার কনফার্ম করে পাঠানো হয়', 'Order confirmed before dispatch')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10">{sections}</div>
          {orderBox}
        </main>
        {footer}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 lg:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-lg lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-500">{product.name}</p>
            <p className="text-lg font-extrabold text-[#047857]">
              {formatBDT(product.price)}
            </p>
          </div>
          <a
            href="#order"
            className="shrink-0 rounded-xl bg-[#047857] px-5 py-2.5 text-sm font-extrabold text-white"
          >
            {t.orderNow}
          </a>
        </div>
      </div>
    )
  }

  // Midnight Premium (Template 16) — গাঢ় মিডনাইট প্রিমিয়াম ডার্ক থিম।
  // ভায়োলেট অ্যাকসেন্ট, দুই কলামের চওড়া হিরো, মোবাইলে স্ট্যাকড।
  // সেকশন ও অর্ডার ফর্ম গাঢ় রূপে (OrderSection-এর dark প্রপস)।
  if (page.template === 'midnight-premium') {
    const L = (bn: string, en: string) =>
      page.page_lang === 'en' ? en : bn
    const savings =
      product.old_price && product.old_price > product.price
        ? product.old_price - product.price
        : 0
    const ratedReviews = data.page.reviews.filter(
      (r) => typeof r.rating === 'number' && r.rating > 0,
    )
    const midnightAvg =
      ratedReviews.length > 0
        ? ratedReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
          ratedReviews.length
        : null
    return (
      <div className="min-h-screen bg-[#0B1020] text-gray-100">
        {discount > 0 ? (
          <div className="bg-[#8B5CF6] px-4 py-2 text-center text-sm font-semibold text-white">
            {t.discountRunning(discount)}
          </div>
        ) : null}
        <header className="border-b border-[#232C44] bg-[#0B1020]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B5CF6] text-base font-extrabold text-white">
                  {shop.name.charAt(0)}
                </span>
              )}
              <span className="text-base font-extrabold tracking-wide text-white">
                {shop.name}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-gray-400 sm:block">
                {t.shopPage}
              </span>
              <a
                href="#order"
                className="hidden rounded-full bg-[#8B5CF6] px-4 py-2 text-sm font-bold text-white sm:block"
              >
                {t.orderNow}
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pt-6 lg:pt-10">
          <div className="rounded-3xl border border-[#232C44] bg-[#141B2E] p-5 lg:p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <div>
                {showGallery ? (
                  <Gallery
                    images={images}
                    productName={product.name}
                    thumbActiveClass="border-[#8B5CF6]"
                  />
                ) : null}
              </div>
              <div>
                {product.category ? (
                  <p className="inline-block rounded-full bg-[#2A2350] px-3 py-1 text-xs font-bold text-[#C4B5FD]">
                    {product.category}
                  </p>
                ) : null}
                <h1 className="mt-3 text-2xl font-extrabold leading-snug text-white lg:text-4xl">
                  {product.name}
                </h1>
                {midnightAvg !== null ? (
                  <p className="mt-2 text-sm text-gray-300">
                    <span className="font-bold text-amber-400">
                      {'★'.repeat(Math.round(midnightAvg))}
                    </span>{' '}
                    {toBnDigits(String(Math.round(midnightAvg * 10) / 10))} ·{' '}
                    {t.basedOnReviews(ratedReviews.length)}
                  </p>
                ) : null}
                <div className="mt-3">
                  <PriceRow data={data} dark />
                </div>
                {savings > 0 ? (
                  <p className="mt-2 inline-block rounded-full bg-[#2A2350] px-3 py-1 text-xs font-bold text-[#C4B5FD]">
                    {L('সাশ্রয়', 'You save')}: {formatBDT(savings)}
                  </p>
                ) : null}
                {heroCopy ? (
                  <p className="mt-3 text-sm leading-relaxed text-gray-300 lg:text-base">
                    {heroCopy}
                  </p>
                ) : null}
                <a
                  href="#order"
                  className="mt-5 block rounded-xl bg-[#8B5CF6] px-4 py-3.5 text-center font-bold text-white shadow-sm"
                >
                  {t.orderNow}
                </a>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-gray-400">
                  <span>✓ {L('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')}</span>
                  <span>
                    ✓ {L('সারা দেশে হোম ডেলিভারি', 'Home delivery across the country')}
                  </span>
                  <span>
                    ✓ {L('অর্ডার কনফার্ম করে পাঠানো হয়', 'Order confirmed before dispatch')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10">{sections}</div>
          <div className="mt-8">
            <OrderSection
              data={data}
              t={t}
              placed={placed}
              preview={preview}
              onPlaced={setPlaced}
              onOrderAgain={() => setPlaced(null)}
              dark
              accent="#A78BFA"
              accentText="#0B1020"
            />
          </div>
        </main>
        {footer}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 lg:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[#232C44] bg-[#141B2E] px-4 py-3 shadow-lg lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-400">{product.name}</p>
            <p className="text-lg font-extrabold text-[#A78BFA]">
              {formatBDT(product.price)}
            </p>
          </div>
          <a
            href="#order"
            className="shrink-0 rounded-xl bg-[#8B5CF6] px-5 py-2.5 text-sm font-extrabold text-white"
          >
            {t.orderNow}
          </a>
        </div>
      </div>
    )
  }

  // Sunset Offer (Template 17) — উষ্ণ সানসেট অফার লুক।
  // উষ্ণ ক্রিম পটভূমি, কমলা অ্যাকসেন্ট, ছাড় বড় করে; ডেস্কটপে
  // দুই কলামের চওড়া হিরো, মোবাইলে স্ট্যাকড + নিজের কমলা বার।
  if (page.template === 'sunset-offer') {
    const L = (bn: string, en: string) =>
      page.page_lang === 'en' ? en : bn
    const savings =
      product.old_price && product.old_price > product.price
        ? product.old_price - product.price
        : 0
    return (
      <div className="min-h-screen bg-[#FFF7ED] text-gray-900">
        {discount > 0 ? (
          <div className="bg-[#EA580C] px-4 py-2 text-center text-sm font-semibold text-white">
            {t.discountRunning(discount)}
          </div>
        ) : null}
        <header className="border-b border-[#FED7AA] bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EA580C] text-base font-extrabold text-white">
                  {shop.name.charAt(0)}
                </span>
              )}
              <span className="text-base font-extrabold tracking-wide text-gray-900">
                {shop.name}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-gray-500 sm:block">
                {t.shopPage}
              </span>
              <a
                href="#order"
                className="hidden rounded-full bg-[#EA580C] px-4 py-2 text-sm font-bold text-white sm:block"
              >
                {t.orderNow}
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pt-6 lg:pt-10">
          <div className="rounded-3xl border border-[#FED7AA] bg-white p-5 shadow-sm lg:p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <div>
                {showGallery ? (
                  <Gallery
                    images={images}
                    productName={product.name}
                    thumbActiveClass="border-[#EA580C]"
                  />
                ) : null}
              </div>
              <div>
                {product.category ? (
                  <p className="inline-block rounded-full bg-[#FFEDD5] px-3 py-1 text-xs font-bold text-[#C2410C]">
                    {product.category}
                  </p>
                ) : null}
                <h1 className="mt-3 text-2xl font-extrabold leading-snug text-gray-900 lg:text-4xl">
                  {product.name}
                </h1>
                <div className="mt-2">
                  <RatingSummary data={data} t={t} />
                </div>
                <div className="mt-3">
                  <PriceRow data={data} dark={false} />
                </div>
                {savings > 0 ? (
                  <p className="mt-2 inline-block rounded-full bg-[#FFEDD5] px-3 py-1 text-xs font-extrabold text-[#C2410C]">
                    {L('সাশ্রয়', 'You save')}: {formatBDT(savings)}
                  </p>
                ) : null}
                {heroCopy ? (
                  <p className="mt-3 text-sm leading-relaxed text-gray-700 lg:text-base">
                    {heroCopy}
                  </p>
                ) : null}
                <a
                  href="#order"
                  className="mt-5 block rounded-xl bg-[#EA580C] px-4 py-3.5 text-center font-bold text-white shadow-sm"
                >
                  {t.orderNow}
                </a>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-gray-600">
                  <span>✓ {L('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')}</span>
                  <span>
                    ✓ {L('সারা দেশে হোম ডেলিভারি', 'Home delivery across the country')}
                  </span>
                  <span>
                    ✓ {L('অর্ডার কনফার্ম করে পাঠানো হয়', 'Order confirmed before dispatch')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10">{sections}</div>
          {orderBox}
        </main>
        {footer}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 lg:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-lg lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-500">{product.name}</p>
            <p className="text-lg font-extrabold text-[#EA580C]">
              {formatBDT(product.price)}
            </p>
          </div>
          <a
            href="#order"
            className="shrink-0 rounded-xl bg-[#EA580C] px-5 py-2.5 text-sm font-extrabold text-white"
          >
            {t.orderNow}
          </a>
        </div>
      </div>
    )
  }

  // Signature Pro (Template 18) — ফ্ল্যাগশিপ: সেরা পেশাদার লুক।
  // উষ্ণ আইভরি কাগজ, গাঢ় পাইন সবুজ অ্যাকসেন্ট, পরিমিত টাইপোগ্রাফি,
  // হিরো কার্ডে পাইন টপ-রুল, দুই কলামের চওড়া হিরো, মোবাইলে স্ট্যাকড
  // + নিজের পাইন স্টিকি বার। অর্ডার সেকশন lightAccent-এ পাইন রঙে মেলে।
  if (page.template === 'signature-pro') {
    const L = (bn: string, en: string) =>
      page.page_lang === 'en' ? en : bn
    const savings =
      product.old_price && product.old_price > product.price
        ? product.old_price - product.price
        : 0
    return (
      <div className="min-h-screen bg-[#FAF8F3] text-stone-900">
        {discount > 0 ? (
          <div className="bg-[#14532D] px-4 py-2 text-center text-sm font-semibold text-white">
            {t.discountRunning(discount)}
          </div>
        ) : null}
        <header className="border-b border-[#E7E1D4] bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#14532D] text-base font-extrabold text-white">
                  {shop.name.charAt(0)}
                </span>
              )}
              <span className="text-base font-extrabold tracking-wide text-stone-900">
                {shop.name}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-stone-500 sm:block">
                {t.shopPage}
              </span>
              <a
                href="#order"
                className="hidden rounded-full bg-[#14532D] px-4 py-2 text-sm font-bold text-white sm:block"
              >
                {t.orderNow}
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pt-6 lg:pt-12">
          <div className="rounded-[2rem] border border-[#E7E1D4] border-t-4 border-t-[#14532D] bg-white p-5 shadow-sm lg:p-10">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
              <div>
                {showGallery ? (
                  <Gallery
                    images={images}
                    productName={product.name}
                    thumbActiveClass="border-[#14532D]"
                  />
                ) : null}
              </div>
              <div>
                {product.category ? (
                  <p className="inline-block rounded-full bg-[#E7EFE7] px-3 py-1 text-xs font-bold tracking-wide text-[#14532D]">
                    {product.category}
                  </p>
                ) : null}
                <h1 className="mt-3 text-2xl font-extrabold leading-snug tracking-tight text-stone-900 lg:text-[2.75rem] lg:leading-[1.15]">
                  {product.name}
                </h1>
                <div className="mt-2">
                  <RatingSummary data={data} t={t} />
                </div>
                <div className="mt-4">
                  <PriceRow data={data} dark={false} />
                </div>
                {savings > 0 ? (
                  <p className="mt-3 inline-block rounded-full bg-[#E7EFE7] px-3 py-1 text-xs font-bold text-[#14532D]">
                    {L('সাশ্রয়', 'You save')}: {formatBDT(savings)}
                  </p>
                ) : null}
                {heroCopy ? (
                  <p className="mt-4 text-sm leading-relaxed text-stone-600 lg:text-[1.05rem] lg:leading-relaxed">
                    {heroCopy}
                  </p>
                ) : null}
                <a
                  href="#order"
                  className="mt-6 block rounded-xl bg-[#14532D] px-4 py-3.5 text-center font-bold text-white shadow-sm hover:bg-[#0F3D21]"
                >
                  {t.orderNow}
                </a>
                <div className="mt-5 rounded-2xl border border-[#E7E1D4] bg-[#FAF8F3] px-4 py-3.5">
                  <p className="text-xs font-bold tracking-wide text-[#14532D]">
                    {L('আস্থা ও নিশ্চয়তা', 'Trust & assurance')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-stone-700">
                    <span>✓ {L('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')}</span>
                    <span>
                      ✓ {L('সারা দেশে হোম ডেলিভারি', 'Home delivery across the country')}
                    </span>
                    <span>
                      ✓ {L('অর্ডার কনফার্ম করে পাঠানো হয়', 'Order confirmed before dispatch')}
                    </span>
                    <span>
                      ✓{' '}
                      {L(
                        `সরাসরি ${shop.name} থেকে অর্ডার`,
                        `Order directly from ${shop.name}`,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12">{sections}</div>
          <div className="mt-10">
            <OrderSection
              data={data}
              t={t}
              placed={placed}
              preview={preview}
              onPlaced={setPlaced}
              onOrderAgain={() => setPlaced(null)}
              accent="#14532D"
              accentText="#FFFFFF"
              lightAccent="#14532D"
            />
          </div>
        </main>
        {footer}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 lg:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[#E7E1D4] bg-white px-4 py-3 shadow-lg lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs text-stone-500">{product.name}</p>
            <p className="text-lg font-extrabold text-[#14532D]">
              {formatBDT(product.price)}
            </p>
          </div>
          <a
            href="#order"
            className="shrink-0 rounded-xl bg-[#14532D] px-5 py-2.5 text-sm font-extrabold text-white"
          >
            {t.orderNow}
          </a>
        </div>
      </div>
    )
  }

  // ---- Marketplace Pro — মার্কেটপ্লেস ধাঁচের প্রোডাক্ট পেজ ----
  // দারাজ/অ্যামাজন-ধাঁচের কাঠামো (ব্র্যান্ডের নাম/লোগো/লেখা নয়, শুধু
  // কাঠামো): ব্রেডক্রাম্ব, বামে গ্যালারি + ডানে তথ্যের কলাম, ডেলিভারি
  // বাক্স, সেলার কার্ড, রেটিং ভাঙনসহ রিভিউ, একই দোকানের আরও পণ্য।
  // সবই আসল ডাটা — ডেলিভারি সময়ের অনুমান, বিক্রির সংখ্যা, ভুয়া
  // রেটিং কিছু নেই। দোকানের আলাদা পেজের রুট নেই, তাই ব্রেডক্রাম্বে
  // দোকানের নাম লিংক নয় (শুধু হোম "/" আসল লিংক)।
  if (page.template === 'marketplace-pro') {
    const L = (bn: string, en: string) =>
      page.page_lang === 'en' ? en : bn
    const savings =
      product.old_price && product.old_price > product.price
        ? product.old_price - product.price
        : 0
    const mpRated = page.reviews.filter(
      (r) => typeof r.rating === 'number' && r.rating > 0,
    )
    const mpAvg =
      mpRated.length > 0
        ? mpRated.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
          mpRated.length
        : 0
    const mpStarCount = (star: number) =>
      mpRated.filter((r) => Math.round(r.rating ?? 0) === star).length
    const freeDeliveryApplies =
      shop.free_delivery_threshold !== null &&
      shop.free_delivery_threshold > 0 &&
      product.price >= Number(shop.free_delivery_threshold)
    const related = data.relatedProducts ?? []
    // রিভিউ সেকশন — রেটিং ভাঙন (৫★ থেকে ১★) + আসল রিভিউ কার্ড।
    // ভাঙন শুধু রেটিং দেওয়া রিভিউ থাকলে; রিভিউ না থাকলে সৎ খালি
    // বার্তা (শেয়ার করা renderSection-এর কার্ড-লেখাই ব্যবহার হয়)।
    const mpReviewsNode =
      page.reviews.length === 0 ? (
        <section key="reviews">
          <h2 className={headingClass}>{t.reviews}</h2>
          <p className={`mt-3 text-sm ${bodyClass}`}>{t.noReviews}</p>
        </section>
      ) : (
        <section key="reviews">
          <h2 className={headingClass}>{t.reviews}</h2>
          {mpRated.length > 0 ? (
            <div className="mt-4 flex flex-col gap-5 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:gap-8">
              <div className="shrink-0 text-center">
                <p className="text-4xl font-extrabold text-gray-900">
                  {toBnDigits(String(Math.round(mpAvg * 10) / 10))}
                </p>
                <p className="mt-1 text-lg font-bold leading-none text-amber-500">
                  {'★'.repeat(Math.round(mpAvg))}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {t.basedOnReviews(mpRated.length)}
                </p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = mpStarCount(star)
                  const pct =
                    mpRated.length > 0
                      ? Math.round((count / mpRated.length) * 100)
                      : 0
                  return (
                    <div
                      key={star}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="w-6 shrink-0 font-semibold text-gray-700">
                        {toBnDigits(star)}★
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <span
                          className="block h-full rounded-full bg-amber-500"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right text-gray-500">
                        {toBnDigits(count)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
          <div className="mt-4 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {page.reviews.map((r, i) => (
              <article
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <ReviewAvatar photoUrl={r.photo_url} name={r.name} />
                  <div>
                    <p className="font-semibold text-gray-900">{r.name}</p>
                    {typeof r.rating === 'number' && r.rating > 0 ? (
                      <p className="text-sm font-bold text-amber-500">
                        {'★'.repeat(Math.round(r.rating))}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className={`mt-2 text-sm ${bodyClass}`}>{r.text}</p>
                {r.screenshot_url ? (
                  <ReviewScreenshot
                    url={r.screenshot_url}
                    alt={`${r.name} — রিভিউর স্ক্রিনশট`}
                  />
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )
    // সেকশন — বিল্ডারের ক্রম ও চালু/বন্ধ মেনে; রিভিউ শুধু উপরের
    // ভাঙনসহ রূপে আসে। প্রতিটি সেকশন সাদা কার্ডে (ধূসর পটভূমিতে)।
    const mpSections = sectionOrder
      .map((id) => {
        const node = id === 'reviews' ? mpReviewsNode : renderSection(id)
        if (!node) return null
        return (
          <div
            key={id}
            className="rounded-xl bg-white p-5 shadow-sm"
          >
            {node}
          </div>
        )
      })
      .filter(Boolean)
    const waText = sellerWhatsapp
      ? encodeURIComponent(
          `আসসালামু আলাইকুম, ${shop.name} — ${product.name} সম্পর্কে জানতে চাই।`,
        )
      : ''
    return (
      <div className="min-h-screen bg-[#F1F1F1] text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F97316] text-base font-extrabold text-white">
                  {shop.name.charAt(0)}
                </span>
              )}
              <span className="text-base font-extrabold tracking-wide text-gray-900">
                {shop.name}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-gray-500 sm:block">
                {t.shopPage}
              </span>
              <a
                href="#order"
                className="hidden rounded-full bg-[#F97316] px-4 py-2 text-sm font-bold text-white sm:block"
              >
                {t.orderNow}
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 pt-4 text-xs text-gray-500"
          >
            <a href="/" className="font-semibold text-[#F97316] hover:underline">
              {L('হোম', 'Home')}
            </a>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-gray-700">{shop.name}</span>
            {product.category ? (
              <>
                <span aria-hidden="true">/</span>
                <span>{product.category}</span>
              </>
            ) : null}
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="min-w-0 truncate text-gray-700">
              {product.name}
            </span>
          </nav>
          <div className="mt-3 rounded-xl bg-white p-4 shadow-sm lg:p-6">
            <div
              className={
                showGallery
                  ? 'lg:grid lg:grid-cols-5 lg:items-start lg:gap-8'
                  : undefined
              }
            >
              <div className={showGallery ? 'lg:col-span-2' : undefined}>
                {showGallery ? (
                  <Gallery
                    images={images}
                    productName={product.name}
                    thumbActiveClass="border-[#F97316]"
                  />
                ) : null}
              </div>
              <div className={showGallery ? 'lg:col-span-3' : undefined}>
                <h1 className="mt-5 text-2xl font-extrabold leading-snug tracking-tight text-gray-900 lg:mt-0 lg:text-3xl lg:leading-tight">
                  {product.name}
                </h1>
                <div className="mt-2">
                  <RatingSummary data={data} t={t} />
                </div>
                <div className="mt-4 flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#F97316] lg:text-4xl">
                    {formatBDT(product.price)}
                  </span>
                  {product.old_price &&
                  product.old_price > product.price ? (
                    <>
                      <span className="text-lg text-gray-400 line-through">
                        {formatBDT(product.old_price)}
                      </span>
                      <span className="rounded-full bg-[#F97316] px-2 py-0.5 text-xs font-bold text-white">
                        {toBnDigits(discount)}% {L('ছাড়', 'off')}
                      </span>
                    </>
                  ) : null}
                </div>
                {savings > 0 ? (
                  <p className="mt-3 inline-block rounded-full bg-[#FFF1E7] px-3 py-1 text-xs font-bold text-[#C2410C]">
                    {L('সাশ্রয়', 'You save')}: {formatBDT(savings)}
                  </p>
                ) : null}
                {heroCopy ? (
                  <p className="mt-4 text-sm leading-relaxed text-gray-600 lg:text-base lg:leading-relaxed">
                    {heroCopy}
                  </p>
                ) : null}
                <div className="mt-5 rounded-xl border border-gray-200 bg-[#FAFAFA] p-4">
                  <p className="text-sm font-bold text-gray-900">
                    {L('ডেলিভারি', 'Delivery')}
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-gray-700">
                    <p>
                      {t.deliveryInside}:{' '}
                      {shop.delivery_inside_charge > 0
                        ? formatBDT(shop.delivery_inside_charge)
                        : t.freeDelivery}
                    </p>
                    <p>
                      {t.deliveryOutside}:{' '}
                      {shop.delivery_outside_charge > 0
                        ? formatBDT(shop.delivery_outside_charge)
                        : t.freeDelivery}
                    </p>
                    {freeDeliveryApplies ? (
                      <p className="font-bold text-[#15803D]">
                        ✓ {L('এই অর্ডারে ডেলিভারি ফ্রি', 'Free delivery on this order')}
                      </p>
                    ) : null}
                    <p className="pt-1 font-semibold">
                      ✓ {L('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')}
                    </p>
                    <p className="font-semibold">
                      ✓ {L('অর্ডার কনফার্ম করে পাঠানো হয়', 'Order confirmed before dispatch')}
                    </p>
                  </div>
                </div>
                <a
                  href="#order"
                  className="mt-5 block rounded-xl bg-[#F97316] px-4 py-3.5 text-center text-lg font-extrabold text-white shadow-sm hover:bg-[#EA580C]"
                >
                  {L('এখনই কিনুন', 'Buy Now')}
                </a>
                <div className="mt-4 rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-lg font-extrabold text-white">
                      {shop.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-gray-900">
                        {shop.name}
                      </p>
                      <p className="text-xs text-gray-500">{t.shopPage}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sellerWhatsapp ? (
                      <a
                        href={`https://wa.me/${sellerWhatsapp}?text=${waText}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 rounded-lg bg-[#25d366] px-3 py-2.5 text-center text-sm font-bold text-white"
                      >
                        WhatsApp-এ মেসেজ করুন
                      </a>
                    ) : null}
                    {related.length > 0 ? (
                      <a
                        href="#related"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-center text-sm font-bold text-gray-700"
                      >
                        {L('আরও পণ্য দেখুন', 'See more products')}
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {mpSections.length > 0 ? (
            <div className="mt-4 space-y-4">{mpSections}</div>
          ) : null}
          {related.length > 0 ? (
            <section
              id="related"
              className="mt-4 rounded-xl bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold text-gray-900">
                {L('এই দোকানের আরও পণ্য', 'More from this shop')}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {related.map((rel) => (
                  <a
                    key={rel.slug}
                    href={`/${shop.slug}/${rel.slug}`}
                    className="group overflow-hidden rounded-xl border border-gray-200 hover:border-[#F97316]"
                  >
                    <div className="aspect-[4/3] w-full bg-gray-100">
                      {rel.imageUrl ? (
                        <img
                          src={rel.imageUrl}
                          alt={rel.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-2 min-h-10 text-sm font-medium leading-snug text-gray-900 group-hover:text-[#C2410C]">
                        {rel.name}
                      </p>
                      <p className="mt-1 text-base font-extrabold text-[#F97316]">
                        {formatBDT(rel.price)}
                      </p>
                      {rel.oldPrice && rel.oldPrice > rel.price ? (
                        <p className="text-xs text-gray-400 line-through">
                          {formatBDT(rel.oldPrice)}
                        </p>
                      ) : null}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
          <div className="mt-4">
            <OrderSection
              data={data}
              t={t}
              placed={placed}
              preview={preview}
              onPlaced={setPlaced}
              onOrderAgain={() => setPlaced(null)}
              accent="#F97316"
              accentText="#FFFFFF"
              lightAccent="#F97316"
            />
          </div>
        </main>
        {footer}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 lg:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 bg-[#F97316] px-4 py-3 shadow-lg lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs text-white/80">{product.name}</p>
            <p className="text-lg font-extrabold text-white">
              {formatBDT(product.price)}
            </p>
          </div>
          <a
            href="#order"
            className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-[#C2410C]"
          >
            {L('এখনই কিনুন', 'Buy Now')}
          </a>
        </div>
      </div>
    )
  }

  if (page.template === 'classic-green') {
    const L = (bn: string, en: string) =>
      page.page_lang === 'en' ? en : bn
    const savings =
      product.old_price && product.old_price > product.price
        ? product.old_price - product.price
        : 0
    return (
      <div className="min-h-screen bg-[#F4FAF6] text-gray-900">
        {discount > 0 ? (
          <div className="bg-[#006a4e] px-4 py-2 text-center text-sm font-semibold text-white">
            {t.discountRunning(discount)}
          </div>
        ) : null}
        <header className="bg-[#006a4e]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-full bg-white object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-base font-extrabold text-[#006a4e]">
                  {shop.name.charAt(0)}
                </span>
              )}
              <span className="text-base font-extrabold tracking-wide text-white">
                {shop.name}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-white/80 sm:block">
                {t.shopPage}
              </span>
              <a
                href="#order"
                className="hidden rounded-full bg-white px-4 py-2 text-sm font-bold text-[#006a4e] sm:block"
              >
                {t.orderNow}
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pt-6 lg:pt-10">
          <div className="rounded-2xl border border-[#CDE9DA] bg-white p-5 shadow-sm lg:p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <div>
                {showGallery ? (
                  <Gallery
                    images={images}
                    productName={product.name}
                    thumbActiveClass="border-[#006a4e]"
                  />
                ) : null}
              </div>
              <div>
                {product.category ? (
                  <p className="inline-block rounded-full bg-[#E6F4EE] px-3 py-1 text-xs font-bold tracking-wide text-[#006a4e]">
                    {product.category}
                  </p>
                ) : null}
                <h1 className="mt-3 text-2xl font-extrabold leading-snug tracking-tight text-gray-900 lg:text-4xl lg:leading-tight">
                  {product.name}
                </h1>
                <div className="mt-2">
                  <RatingSummary data={data} t={t} />
                </div>
                <div className="mt-4">
                  <PriceRow data={data} dark={false} />
                </div>
                {savings > 0 ? (
                  <p className="mt-3 inline-block rounded-full bg-[#E6F4EE] px-3 py-1 text-xs font-bold text-[#006a4e]">
                    {L('সাশ্রয়', 'You save')}: {formatBDT(savings)}
                  </p>
                ) : null}
                {heroCopy ? (
                  <p className="mt-4 text-sm leading-relaxed text-gray-600 lg:text-base lg:leading-relaxed">
                    {heroCopy}
                  </p>
                ) : null}
                <a
                  href="#order"
                  className="mt-6 block rounded-xl bg-[#006a4e] px-4 py-3.5 text-center font-bold text-white shadow-sm hover:bg-[#00563f]"
                >
                  {t.orderNow}
                </a>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-gray-700">
                  <span>✓ {L('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')}</span>
                  <span>
                    ✓ {L('সারা দেশে হোম ডেলিভারি', 'Home delivery across the country')}
                  </span>
                  <span>
                    ✓ {L('অর্ডার কনফার্ম করে পাঠানো হয়', 'Order confirmed before dispatch')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10">{sections}</div>
          <div className="mt-10">
            <OrderSection
              data={data}
              t={t}
              placed={placed}
              preview={preview}
              onPlaced={setPlaced}
              onOrderAgain={() => setPlaced(null)}
              accent="#006a4e"
              accentText="#FFFFFF"
              lightAccent="#006a4e"
            />
          </div>
        </main>
        {footer}
        {/* স্টিকি বারের নিচে ফুটার ঢাকা না পড়ে — পেজের নিচে ফাঁকা জায়গা। */}
        <div className="h-20 lg:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 bg-[#006a4e] px-4 py-3 shadow-lg lg:hidden">
          <div className="min-w-0">
            <p className="truncate text-xs text-white/80">{product.name}</p>
            <p className="text-lg font-extrabold text-white">
              {formatBDT(product.price)}
            </p>
          </div>
          <a
            href="#order"
            className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-[#006a4e]"
          >
            {t.orderNow}
          </a>
        </div>
      </div>
    )
  }

  // minimal-white (ডিফল্ট)
  return (
    <div className={`min-h-screen ${pageShell}`}>
      {announcement}
      {shopHeader}
      <main className="mx-auto max-w-2xl px-4 pt-6 lg:max-w-6xl lg:pt-10">
        {hero}
        <div className="mt-8">{sections}</div>
        {orderBox}
      </main>
      {footer}
      {sticky}
    </div>
  )
}
