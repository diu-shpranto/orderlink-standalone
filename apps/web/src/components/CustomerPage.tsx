// কাস্টমার পেজ — পণ্যের পাবলিক ল্যান্ডিং পেজ, বেছে নেওয়া টেমপ্লেটে রেন্ডার।
// একই কম্পোনেন্ট লাইভ পেজ ও বিল্ডারের লাইভ প্রিভিউ — দুই জায়গায় চলে।
// নিয়ম: ভুয়া রিভিউ/রেটিং/ছাড় নেই — শুধু আসল সেভ করা ডাটা; রিভিউ না
// থাকলে রেটিং দেখানো হয় না। ডেলিভারি চার্জ শুধু দোকানের সেটিংস থেকে।
// ভেরিয়েন্ট নেই। স্টিকি মোবাইল অর্ডার বার শুধু Aura/Nova/Social Proof-এ।
// ছবি 4:3 ফ্রেমে, object-contain, ঝাপসা কপি। ছাড়ের % অটো-হিসাব।
// অর্ডার ফর্ম আসল — জমা হলে ধন্যবাদ পেজ দেখায় (অর্ডার নম্বরসহ)।
import { useState } from 'react'
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
}: {
  images: ProductImageRow[]
  productName: string
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
                i === active ? 'border-brand' : 'border-transparent'
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
}: {
  data: CustomerPageData
  t: StringsType
  placed: PlacedOrder | null
  preview: boolean
  onPlaced: (placed: PlacedOrder) => void
  onOrderAgain: () => void
}) {
  const { shop, sellerWhatsapp, product } = data
  if (placed) {
    const waText = encodeURIComponent(
      `আমার অর্ডার ${placed.orderCode} — "${product.name}"।`,
    )
    return (
      <section
        id="order"
        className="rounded-2xl border border-gray-200 bg-white p-5 text-center"
      >
        <p className="text-4xl">✓</p>
        <h2 className="mt-2 text-xl font-extrabold text-gray-900">
          {t.orderPlaced}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {t.orderReceived}
        </p>
        <div className="mx-auto mt-4 max-w-sm space-y-1 rounded-xl bg-gray-50 px-4 py-3 text-left text-sm">
          <p className="flex justify-between">
            <span className="text-gray-600">{t.orderNumber}</span>
            <span className="font-bold">{placed.orderCode}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-600">{product.name}</span>
            <span className="font-semibold">
              × {toBnDigits(placed.quantity)}
            </span>
          </p>
          <p className="flex justify-between border-t border-gray-200 pt-2 font-extrabold">
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
          className="mt-3 text-sm font-semibold text-brand-dark underline"
        >
          {t.orderAgain}
        </button>
      </section>
    )
  }
  return (
    <section id="order" className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-bold text-gray-900">{t.orderNow}</h2>
      <div className="mt-3 space-y-1 text-sm text-gray-700">
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
      {preview ? (
        <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
          এটা প্রিভিউ — এখান থেকে অর্ডার দেওয়া যাবে না। প্রকাশ করা পেজে
          কাস্টমাররা এই ফর্মে অর্ডার দেবে।
        </p>
      ) : (
        <div className="mt-4">
          <OrderForm data={data} t={t} onPlaced={onPlaced} />
        </div>
      )}
    </section>
  )
}

function StickyOrderBar({ data, t }: { data: CustomerPageData; t: StringsType }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-lg md:hidden">
      <div>
        <p className="text-xs text-gray-500">{data.product.name}</p>
        <p className="text-lg font-extrabold text-gray-900">
          {formatBDT(data.product.price)}
        </p>
      </div>
      <a
        href="#order"
        className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white"
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
  const { page, product, shop, images } = data
  const [placed, setPlaced] = useState<PlacedOrder | null>(null)
  const t: StringsType = customerStrings(page.page_lang)
  const meta = templateById(page.template)
  const dark = meta.dark
  const discount = discountPercent(product.price, product.old_price)
  const showGallery =
    page.sections['gallery'] !== false && images.length > 0

  // সেকশনের ক্রম — Social Proof-এ রিভিউ সবার আগে (চালু থাকলে)।
  let sectionOrder = page.section_order.filter(
    (id) => id !== 'gallery' && page.sections[id] !== false,
  )
  if (page.template === 'social-proof' && sectionOrder.includes('reviews')) {
    sectionOrder = [
      'reviews',
      ...sectionOrder.filter((id) => id !== 'reviews'),
    ]
  }

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
      <div className="mt-2">
        <RatingSummary data={data} t={t} />
      </div>
      <div className="mt-3">
        <PriceRow data={data} dark={dark} />
      </div>
      {product.description ? (
        <p className={`mt-3 text-sm leading-relaxed ${bodyClass}`}>
          {product.description}
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

  const footer = (
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
  )

  const sticky = meta.stickyBar ? <StickyOrderBar data={data} t={t} /> : null

  // ---- ৮ টেমপ্লেটের লেআউট ----
  if (page.template === 'premium-ecommerce') {
    return (
      <div className={`min-h-screen ${pageShell}`}>
        {announcement}
        {shopHeader}
        <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>{showGallery ? <Gallery images={images} productName={product.name} /> : null}</div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 md:text-3xl">
                {product.name}
              </h1>
              <div className="mt-2">
                <RatingSummary data={data} t={t} />
              </div>
              <div className="mt-3">
                <PriceRow data={data} dark={false} />
              </div>
              {product.description ? (
                <p className="mt-3 text-sm leading-relaxed text-gray-700">
                  {product.description}
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
          <div className="mt-3">
            <RatingSummary data={data} t={t} />
          </div>
          <div className="mt-4">
            <PriceRow data={data} dark={false} />
          </div>
          {product.description ? (
            <p className="mt-6 text-lg leading-relaxed text-gray-700">
              {product.description}
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
        <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-6">
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

  // minimal-white (ডিফল্ট)
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
