// কাস্টমার পেজ — পণ্যের পাবলিক ল্যান্ডিং পেজ, বেছে নেওয়া টেমপ্লেটে রেন্ডার।
// একই কম্পোনেন্ট লাইভ পেজ ও বিল্ডারের লাইভ প্রিভিউ — দুই জায়গায় চলে।
// নিয়ম: ভুয়া রিভিউ/রেটিং/ছাড় নেই — শুধু আসল সেভ করা ডাটা; রিভিউ না
// থাকলে রেটিং দেখানো হয় না। ডেলিভারি চার্জ শুধু দোকানের সেটিংস থেকে।
// ভেরিয়েন্ট নেই। স্টিকি মোবাইল অর্ডার বার শুধু Aura/Nova/Social Proof-এ
// (শেয়ার করা বার); Luxury/Fashion/Tech/Beauty/BD/Lavender/Emerald/
// Midnight/Sunset-এর নিজের বার।
// ছবি আসল অনুপাতে, ঝাপসা কপি নেই, কখনো ক্রপ হয় না। ছাড়ের % অটো-হিসাব।
// অর্ডার ফর্ম আসল — জমা হলে ধন্যবাদ পেজ দেখায় (অর্ডার নম্বরসহ)।
import { useEffect, useState } from 'react'
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
  ProductImageRow,
} from '../lib/types.ts'
import type { CustomerStrings as StringsType } from '../lib/i18n.ts'

function youtubeEmbedId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/,
  )
  return m ? m[1] : null
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
      <FramedPhoto src={current.url} alt={productName} />
      {images.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded border-2 ${
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
  return (
    <section
      id="order"
      className={`rounded-2xl border p-5 ${
        dark ? 'border-[#34343A] bg-[#1D1D21]' : 'border-gray-200 bg-white'
      }`}
    >
      <h2
        className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}
      >
        {t.orderNow}
      </h2>
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
          এটা প্রিভিউ — এখান থেকে অর্ডার দেওয়া যাবে না। প্রকাশ করা পেজে
          কাস্টমাররা এই ফর্মে অর্ডার দেবে।
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
    ? 'text-lg font-bold text-white'
    : 'text-lg font-bold text-gray-900'
  const bodyClass = dark ? 'text-gray-300' : 'text-gray-700'

  function renderSection(id: string) {
    switch (id) {
      case 'benefits':
        if (product.benefits.length === 0) return null
        return (
          <section key="benefits">
            <h2 className={headingClass}>{t.benefits}</h2>
            <ul className={`mt-3 space-y-2 ${bodyClass}`}>
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
        const embedId = page.video_url
          ? youtubeEmbedId(page.video_url)
          : null
        if (!embedId) return null
        return (
          <section key="video">
            <h2 className={headingClass}>{t.video}</h2>
            <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl">
              <iframe
                src={`https://www.youtube.com/embed/${embedId}`}
                title={product.name}
                className="h-full w-full"
                allowFullScreen
              />
            </div>
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
              <div className="mt-3 space-y-3">
                <RatingSummary data={data} t={t} />
                {page.reviews.map((r, i) => (
                  <article
                    key={i}
                    className={`rounded-xl border p-4 ${
                      dark
                        ? 'border-gray-700 bg-gray-800'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <p className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                      {r.name}
                    </p>
                    {typeof r.rating === 'number' && r.rating > 0 ? (
                      <p className="text-sm font-bold text-amber-500">
                        {'★'.repeat(Math.round(r.rating))}
                      </p>
                    ) : null}
                    <p className={`mt-1 text-sm ${bodyClass}`}>{r.text}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )
      case 'faq':
        if (page.faqs.length === 0) return null
        return (
          <section key="faq">
            <h2 className={headingClass}>{t.faq}</h2>
            <div className="mt-3 space-y-3">
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

  // B — প্রোডাক্ট হিরো: ছবি পুরো চওড়ায় উপরে, তথ্য নিচে (লাইভ অ্যাপের
  // মতো — সব টেমপ্লেটে একই 4:3 ফ্রেম)। পরিমাণ শুধু অর্ডার ফর্মে থাকে।
  const hero = (
    <>
      {showGallery ? (
        <Gallery images={images} productName={product.name} />
      ) : null}
      <h1
        className={`mt-5 text-2xl font-extrabold leading-snug md:text-3xl ${
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
      <a
        href="#order"
        className="mt-5 block rounded-lg bg-accent px-4 py-3 text-center font-semibold text-white"
      >
        {t.orderNow}
      </a>
    </>
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

  const sections = (
    <div className="space-y-8">{sectionOrder.map((id) => renderSection(id))}</div>
  )

  const shopHeader = (
    <header
      className={`flex items-center justify-between px-4 py-3 ${
        page.template === 'modern-premium'
          ? 'bg-brand text-white'
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
    <div className="mx-auto mt-10 max-w-2xl px-4">
      <div
        className={`rounded-2xl border p-5 shadow-sm ${
          dark
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white">
            {shop.name.charAt(0)}
          </span>
          <div>
            <p
              className={`font-extrabold ${dark ? 'text-white' : 'text-gray-900'}`}
            >
              আমাদের সাথে যোগাযোগ করুন
            </p>
            <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              {shop.name}
            </p>
          </div>
        </div>
        <a
          href={`https://wa.me/${sellerWhatsapp}?text=${waText}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block rounded-xl bg-[#25d366] px-4 py-3 text-center font-bold text-white"
        >
          WhatsApp-এ মেসেজ করুন
        </a>
        <div
          className={`mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 border-t pt-3 text-xs ${
            dark
              ? 'border-gray-700 text-gray-400'
              : 'border-gray-100 text-gray-500'
          }`}
        >
          <span>✓ সারা দেশে ডেলিভারি</span>
          <span>✓ অর্ডার কনফার্ম করে পাঠানো হয়</span>
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
      <p className="font-bold">
        <span className="text-brand">Order</span>
        <span className="text-accent">link</span>
      </p>
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
    const videoEmbedId =
      page.sections['video'] !== false && page.video_url
        ? youtubeEmbedId(page.video_url)
        : null
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
        <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 md:max-w-4xl md:pb-12">
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
            <div className="mt-4 grid grid-cols-2 gap-3">
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
            <div className="mt-5 space-y-3">
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
          {videoEmbedId ? (
            <section className="mt-12">
              <h2 className={luxH2}>{t.video}</h2>
              <span className="mt-3 block h-px w-12 bg-[#D6B36A]" />
              <div className="mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-[#34343A]">
                <iframe
                  src={`https://www.youtube.com/embed/${videoEmbedId}`}
                  title={product.name}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
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
                <div className="mt-5 space-y-3">
                  {luxRated.length > 0 ? (
                    <p className="text-sm text-[#B8B8B8]">
                      <span className="font-bold text-[#D6B36A]">
                        {'★'.repeat(Math.round(luxAvg))}
                      </span>{' '}
                      {toBnDigits(String(Math.round(luxAvg * 10) / 10))} ·{' '}
                      {t.basedOnReviews(luxRated.length)}
                    </p>
                  ) : null}
                  {page.reviews.map((r, i) => (
                    <article
                      key={i}
                      className="rounded-2xl border border-[#34343A] bg-[#1D1D21] p-4"
                    >
                      <p className="font-semibold text-white">{r.name}</p>
                      {typeof r.rating === 'number' && r.rating > 0 ? (
                        <p className="text-sm font-bold text-[#D6B36A]">
                          {'★'.repeat(Math.round(r.rating))}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm leading-relaxed text-[#B8B8B8]">
                        {r.text}
                      </p>
                    </article>
                  ))}
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
              <div className="mt-5 space-y-3">
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
          <p className="font-serif text-xl font-bold">
            <span className="text-[#D6B36A]">Order</span>
            <span className="text-white">link</span>
          </p>
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
        <StickyOrderBar data={data} t={t} gold />
      </div>
    )
  }

  // ---- বাকি ৮ টেমপ্লেটের লেআউট ----
  if (page.template === 'premium-ecommerce') {
    return (
      <div className={`min-h-screen ${pageShell}`}>
        {announcement}
        {shopHeader}
        <main className="mx-auto max-w-5xl px-4 py-6">
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
        <main className="mx-auto max-w-2xl px-4 py-6">
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
        <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            {hero}
          </div>
          <div className="mt-8">{sections}</div>
          {orderBox}
        </main>
        {footer}
        {sticky}
      </div>
    )
  }

  if (page.template === 'nova-editorial') {
    return (
      <div className={`min-h-screen ${pageShell}`}>
        {announcement}
        {shopHeader}
        <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
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
          <a
            href="#order"
            className="mt-6 block rounded-lg bg-gray-900 px-4 py-3 text-center font-semibold text-white"
          >
            {t.orderNow}
          </a>
          <div className="mt-10 space-y-10">{sectionOrder.map((id) => renderSection(id))}</div>
          {orderBox}
        </main>
        {footer}
        {sticky}
      </div>
    )
  }

  if (page.template === 'modern-premium') {
    return (
      <div className={`min-h-screen ${pageShell}`}>
        {announcement}
        {shopHeader}
        <main className="mx-auto max-w-2xl px-4 py-6">
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
        <main className="mx-auto max-w-2xl px-4 py-6">
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
    return (
      <div className={`min-h-screen ${pageShell}`}>
        {announcement}
        {shopHeader}
        <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-6">
          {hero}
          <div className="mt-8">{sections}</div>
          {orderBox}
        </main>
        {footer}
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
    const videoEmbedId = page.video_url ? youtubeEmbedId(page.video_url) : null
    const showVideo =
      page.sections['video'] !== false && videoEmbedId !== null
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

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-10">
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
              <div className="mt-5 space-y-4">
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

          {showVideo && videoEmbedId ? (
            <section className="mt-12">
              <h2 className="font-serif text-2xl font-bold">{t.video}</h2>
              <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${videoEmbedId}`}
                  title={product.name}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
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
                <div className="mt-5 space-y-3">
                  <RatingSummary data={data} t={t} />
                  {page.reviews.map((r, i) => (
                    <article
                      key={i}
                      className="rounded-2xl border border-[#EAE8E2] bg-white p-4"
                    >
                      <p className="font-semibold">{r.name}</p>
                      {typeof r.rating === 'number' && r.rating > 0 ? (
                        <p className="text-sm font-bold text-amber-500">
                          {'★'.repeat(Math.round(r.rating))}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm leading-relaxed text-[#555555]">
                        {r.text}
                      </p>
                    </article>
                  ))}
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
    const videoEmbedId = page.video_url ? youtubeEmbedId(page.video_url) : null
    const showVideo =
      page.sections['video'] !== false && videoEmbedId !== null
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

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-10">
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
              <div className="mt-5 space-y-4">
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

          {showVideo && videoEmbedId ? (
            <section className="mt-12">
              <h2 className="font-serif text-2xl font-bold">{t.video}</h2>
              <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${videoEmbedId}`}
                  title={product.name}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
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
                <div className="mt-5 space-y-3">
                  <RatingSummary data={data} t={t} />
                  {page.reviews.map((r, i) => (
                    <article
                      key={i}
                      className="rounded-2xl border border-[#F1E4E7] bg-white p-4"
                    >
                      <p className="font-semibold">{r.name}</p>
                      {typeof r.rating === 'number' && r.rating > 0 ? (
                        <p className="text-sm font-bold text-amber-500">
                          {'★'.repeat(Math.round(r.rating))}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm leading-relaxed text-[#5c4a52]">
                        {r.text}
                      </p>
                    </article>
                  ))}
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
          <p className="font-serif text-xl font-bold">
            <span className="text-[#D86F91]">Order</span>
            <span className="text-[#30252A]">link</span>
          </p>
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
    const videoEmbedId =
      page.sections['video'] !== false && page.video_url
        ? youtubeEmbedId(page.video_url)
        : null
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

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-10">
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
                <div className="mt-5 space-y-3">
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
          {videoEmbedId ? (
            <section className="mt-12">
              <h2 className={techH2}>{t.video}</h2>
              <span className="mt-3 block h-px w-12 bg-[#19C8F0]" />
              <div className="mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-[#283A54]">
                <iframe
                  src={`https://www.youtube.com/embed/${videoEmbedId}`}
                  title={product.name}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
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
                <div className="mt-5 space-y-3">
                  {techRated.length > 0 ? (
                    <p className="text-sm text-[#A8B5C8]">
                      <span className="font-bold text-amber-400">
                        {'★'.repeat(Math.round(techAvg))}
                      </span>{' '}
                      {toBnDigits(String(Math.round(techAvg * 10) / 10))} ·{' '}
                      {t.basedOnReviews(techRated.length)}
                    </p>
                  ) : null}
                  {page.reviews.map((r, i) => (
                    <article
                      key={i}
                      className="rounded-2xl border border-[#283A54] bg-[#17243A] p-4"
                    >
                      <p className="font-semibold text-white">{r.name}</p>
                      {typeof r.rating === 'number' && r.rating > 0 ? (
                        <p className="text-sm font-bold text-amber-400">
                          {'★'.repeat(Math.round(r.rating))}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm leading-relaxed text-[#A8B5C8]">
                        {r.text}
                      </p>
                    </article>
                  ))}
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
          <p className="text-xl font-extrabold">
            <span className="text-[#19C8F0]">Order</span>
            <span className="text-white">link</span>
          </p>
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
    const videoEmbedId =
      page.sections['video'] !== false && page.video_url
        ? youtubeEmbedId(page.video_url)
        : null
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
        <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 md:max-w-4xl md:pb-12">
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
            <div className="grid grid-cols-2 gap-3">
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
              <div className="mt-5 space-y-3">
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
          {videoEmbedId ? (
            <section className="mt-12">
              <p className={bdEyebrow}>{L('ভিডিও', 'Video')}</p>
              <h2 className={`${bdH2} mt-1`}>{t.video}</h2>
              <span className="mt-3 block h-1 w-12 rounded bg-[#E11D2E]" />
              <div className="mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-gray-200">
                <iframe
                  src={`https://www.youtube.com/embed/${videoEmbedId}`}
                  title={product.name}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
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
                <div className="mt-5 space-y-3">
                  {bdRated.length > 0 ? (
                    <p className="text-sm text-gray-600">
                      <span className="font-bold text-amber-500">
                        {'★'.repeat(Math.round(bdAvg))}
                      </span>{' '}
                      {toBnDigits(String(Math.round(bdAvg * 10) / 10))} ·{' '}
                      {t.basedOnReviews(bdRated.length)}
                    </p>
                  ) : null}
                  {page.reviews.map((r, i) => (
                    <article
                      key={i}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <p className="font-bold text-gray-900">{r.name}</p>
                      {typeof r.rating === 'number' && r.rating > 0 ? (
                        <p className="text-sm font-bold text-amber-500">
                          {'★'.repeat(Math.round(r.rating))}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm leading-relaxed text-gray-700">
                        {r.text}
                      </p>
                    </article>
                  ))}
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
              <div className="mt-5 space-y-3">
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
          <p className="text-xl font-extrabold">
            <span className="text-[#16A34A]">Order</span>
            <span className="text-[#E11D2E]">link</span>
          </p>
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
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:py-10 lg:pb-10">
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
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:py-10 lg:pb-10">
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
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:py-10 lg:pb-10">
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
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:py-10 lg:pb-10">
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
        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:py-12 lg:pb-12">
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

  // minimal-white (ডিফল্ট)
  return (
    <div className={`min-h-screen ${pageShell}`}>
      {announcement}
      {shopHeader}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {hero}
        <div className="mt-8">{sections}</div>
        {orderBox}
      </main>
      {footer}
      {sticky}
    </div>
  )
}
