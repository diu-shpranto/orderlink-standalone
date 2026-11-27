// হোম পেজ — লাইভ Orderlink অ্যাপের হোমের রেপ্লিকা।
// সাদা ন্যাভবার (গাঢ় সবুজ লিংক), গাঢ় সবুজ হিরো + গ্লো, CSS ফোন মকআপ
// (আঁকা ওয়ালেট), সমস্যার স্ট্রিপ (ডট টেক্সচার), ৪ ধাপের স্লাইডার
// (প্রতি ধাপে ছোট ফোন ভিজ্যুয়াল; ফোনে শুধু সক্রিয় ধাপ),
// সবুজ টাইলসহ ৬ ফিচার, টেমপ্লেট গ্যালারি (ঠিক ৪টি, ব্রাউজার ফ্রেমে
// আসল ডেমো পেজের রেন্ডার), প্রাইসিং (৪ প্যাকেজ), ৫ প্রশ্নের FAQ,
// ৮৮০px গ্রেডিয়েন্ট CTA কার্ড, প্রিমিয়াম ফুটার।
// কোনো ভুয়া পরিসংখ্যান নেই — সংখ্যা শুধু প্যাকেজের দাম/সীমা।
import { useEffect, useState } from 'react'
import { LogoWordmark } from '../components/Logo.tsx'
import {
  IconBox,
  IconCheck,
  IconDoc,
  IconMenu,
  IconPhone,
  IconReceipt,
  IconShield,
  IconStore,
  IconX,
} from '../components/icons.tsx'
import { storageLabel } from '../lib/catalog.ts'
import { fetchPlans, type PlanRow } from '../lib/subscription.ts'
import { discountPercent, formatBDT, toBnDigits } from '../lib/pricing.ts'
import { navigate } from '../lib/router.ts'
import { INTRO_TEMPLATES, templateById } from '../lib/templates.ts'

const DEMO_WALLET = {
  shopName: 'ডেমো শপ',
  productName: 'প্রিমিয়াম লেদার ওয়ালেট',
  price: 850,
  oldPrice: 1200,
}

const DEMO_EARBUDS = {
  shopName: 'ডেমো শপ',
  productName: 'ওয়্যারলেস ব্লুটুথ ইয়ারবাড',
  price: 1250,
  oldPrice: 1800,
}

// গ্যালারির ৪ কার্ডে দুই ডেমো পণ্য পর্যায়ক্রমে — লাইভ অ্যাপের মতো
// প্রতিটা কার্ড আলাদা টেমপ্লেটের পরিচয় নিয়ে আসে।
const GALLERY_PRODUCTS = [DEMO_WALLET, DEMO_EARBUDS, DEMO_WALLET, DEMO_EARBUDS]

const STEPS = [
  {
    title: 'অ্যাকাউন্ট খুলুন',
    text: 'ইমেইল বা Google দিয়ে অ্যাকাউন্ট খুলুন, দোকানের নাম ও WhatsApp নম্বর দিন।',
  },
  {
    title: 'প্রোডাক্ট যোগ করুন',
    text: 'ছবি, দাম, বিবরণ দিন — ৮টি টেমপ্লেট থেকে পেজের ডিজাইন বাছুন।',
  },
  {
    title: 'লিংক শেয়ার করুন',
    text: 'ফেসবুক পোস্টে পেজের লিংক দিন — কাস্টমার সাজানো ফর্মে অর্ডার দেবে।',
  },
  {
    title: 'অর্ডার Sheet-এ পান',
    text: 'প্রতিটা অর্ডার অটোমেটিক আপনার Google Sheet-এর আজকের ট্যাবে জমা হবে।',
  },
]

const FEATURES = [
  {
    title: 'ল্যান্ডিং পেজ বিল্ডার',
    text: 'কোডিং ছাড়া সুন্দর পণ্যের পেজ বানান — ছবি, ভিডিও, রিভিউ, FAQ সহ।',
    icon: <IconStore className="h-5 w-5" />,
  },
  {
    title: 'Google Sheet অটো-সিঙ্ক',
    text: 'অর্ডার এলেই আপনার Sheet-এ সারি যোগ হয় — হাতে লিখতে হয় না।',
    icon: <IconDoc className="h-5 w-5" />,
  },
  {
    title: 'অর্ডার ব্যবস্থাপনা',
    text: 'অর্ডারের স্ট্যাটাস, ফোনে কল, হিসাব — সব এক জায়গায়।',
    icon: <IconReceipt className="h-5 w-5" />,
  },
  {
    title: '৮টি টেমপ্লেট',
    text: 'পণ্য অনুযায়ী ডিজাইন বাছুন — সাদা, অফার, প্রিমিয়াম, ডার্ক।',
    icon: <IconBox className="h-5 w-5" />,
  },
  {
    title: 'মোবাইল-ফ্রেন্ডলি',
    text: 'কাস্টমারের ফোনে পেজ নিখুঁত দেখায় — অর্ডার ফর্মও ফোনে সহজ।',
    icon: <IconPhone className="h-5 w-5" />,
  },
  {
    title: 'সহজ মাসিক প্ল্যান',
    text: 'এক পেমেন্টে ৩০ দিনের পুরো অ্যাক্সেস — কোনো লুকানো চার্জ নেই।',
    icon: <IconShield className="h-5 w-5" />,
  },
]

const FAQ_ITEMS = [
  {
    q: 'Orderlink কী?',
    a: 'Orderlink দিয়ে ফেসবুক সেলাররা কোডিং ছাড়া পণ্যের ল্যান্ডিং পেজ বানান, আর কাস্টমারের অর্ডার অটোমেটিক নিজের Google Sheet-এ পান।',
  },
  {
    q: 'অর্ডার কীভাবে Google Sheet-এ যায়?',
    a: 'কাস্টমার পেজের ফর্মে অর্ডার দিলে সেটা প্রথমে ডাটাবেসে সেভ হয়, তারপর সার্ভার থেকে আপনার Sheet-এর সেদিনের ট্যাবে সারি যোগ হয়। সিঙ্ক ব্যর্থ হলে অটো-রিট্রাই চলে।',
  },
  {
    q: 'পেমেন্ট কীভাবে নেব?',
    a: 'সাবস্ক্রিপশনের পেমেন্ট ম্যানুয়াল — bKash, Nagad বা Upay-তে Send Money করে TrxID জমা দিলে অ্যাডমিন অনুমোদন দেন, তারপর প্যাকেজ চালু হয়।',
  },
  {
    q: 'ফ্রি প্ল্যানে কী পাওয়া যায়?',
    a: 'নতুন অ্যাকাউন্ট ফ্রি প্ল্যানে শুরু হয় — ১টি পেজ প্রকাশ করা যায়। বেশি পেজ লাগলে মাসিক প্যাকেজ নিতে হয়।',
  },
  {
    q: 'আমার ডাটা কি নিরাপদ?',
    a: 'হ্যাঁ — প্রতিটা সেলার শুধু নিজের ডাটাই দেখতে পারে (ডাটাবেসের নিয়মে বাঁধা)। অ্যাডমিন কাস্টমারের নাম, ফোন বা ঠিকানা দেখতে পারে না।',
  },
]

const NAV_LINKS = [
  { href: '#home', label: 'হোম' },
  { href: '#features', label: 'ফিচার' },
  { href: '#how', label: 'কীভাবে কাজ করে' },
  { href: '#templates', label: 'টেমপ্লেট' },
  { href: '#pricing', label: 'প্রাইসিং' },
  { href: '#faq', label: 'জিজ্ঞাসা' },
]

/** CSS-এ আঁকা চামড়ার ওয়ালেট — আসল ছবির বদলে মকআপে। */
function WalletArt({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#3d2b1f] shadow-inner ${className ?? ''}`}
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 top-0 h-[46%] rounded-t-xl bg-[#5b3a24] shadow-md" />
      <div className="absolute inset-2 rounded-lg border border-dashed border-white/25" />
      <div className="absolute inset-x-0 top-[46%] h-px bg-black/40" />
      <div className="absolute bottom-2 right-2 h-3 w-8 rounded-full bg-[#8a5a33]" />
    </div>
  )
}

/** CSS-এ আঁকা ইয়ারবাড — দুই বাড + স্টেম। */
function EarbudsArt({ className }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center gap-3 bg-gradient-to-br from-slate-100 to-slate-300 ${className ?? ''}`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center">
        <div className="h-7 w-7 rounded-full bg-white shadow-md ring-1 ring-slate-200" />
        <div className="h-8 w-2.5 rounded-b-full bg-white shadow-md" />
      </div>
      <div className="flex flex-col items-center">
        <div className="h-7 w-7 rounded-full bg-white shadow-md ring-1 ring-slate-200" />
        <div className="h-8 w-2.5 rounded-b-full bg-white shadow-md" />
      </div>
    </div>
  )
}

function ProductArt({
  product,
  className,
}: {
  product: typeof DEMO_WALLET
  className?: string
}) {
  return product.productName.includes('ইয়ারবাড') ? (
    <EarbudsArt className={className} />
  ) : (
    <WalletArt className={className} />
  )
}

function PhoneMockup() {
  const discount = discountPercent(DEMO_WALLET.price, DEMO_WALLET.oldPrice)
  return (
    <div className="relative mx-auto w-64 sm:w-72">
      {/* হিরোর গ্লো */}
      <div
        className="absolute -inset-10 rounded-full bg-white/15 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative rotate-2 rounded-[2rem] border-4 border-gray-900 bg-white text-gray-900 shadow-2xl">
        <div className="mx-auto mt-2 h-4 w-20 rounded-full bg-gray-900" />
        <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
          <span className="flex items-center gap-2 font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">
              ড
            </span>
            {DEMO_WALLET.shopName}
          </span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
            নমুনা
          </span>
        </div>
        <ProductArt product={DEMO_WALLET} className="aspect-[4/3] w-full" />
        <div className="p-4">
          <p className="font-bold">{DEMO_WALLET.productName}</p>
          <p className="mt-1">
            <span className="text-lg font-extrabold">
              {formatBDT(DEMO_WALLET.price)}
            </span>{' '}
            <span className="text-sm text-gray-400 line-through">
              {formatBDT(DEMO_WALLET.oldPrice)}
            </span>{' '}
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
              {toBnDigits(discount)}% ছাড়
            </span>
          </p>
          <span className="mt-3 block rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-bold text-white">
            অর্ডার করুন
          </span>
        </div>
      </div>
    </div>
  )
}

/** স্লাইডারের প্রতি ধাপের ছোট ফোন ভিজ্যুয়াল। */
function StepPhone({ step }: { step: number }) {
  return (
    <div className="mx-auto w-[218px] shrink-0 rounded-[1.75rem] border-[3px] border-gray-900 bg-white shadow-xl">
      <div className="mx-auto mt-2 h-3 w-14 rounded-full bg-gray-900" />
      <div className="p-3">
        {step === 0 ? (
          <div className="space-y-2.5">
            <p className="text-center text-xs font-extrabold text-gray-900">
              অ্যাকাউন্ট খুলুন
            </p>
            <div className="h-8 rounded-lg border border-gray-300 bg-gray-50 px-2 py-2 text-[10px] text-gray-400">
              আপনার নাম
            </div>
            <div className="h-8 rounded-lg border border-gray-300 bg-gray-50 px-2 py-2 text-[10px] text-gray-400">
              দোকানের নাম
            </div>
            <div className="rounded-lg bg-brand px-3 py-2 text-center text-[11px] font-bold text-white">
              অ্যাকাউন্ট খুলুন
            </div>
          </div>
        ) : step === 1 ? (
          <div className="space-y-2">
            <ProductArt product={DEMO_WALLET} className="aspect-[4/3] w-full rounded-lg" />
            <p className="text-xs font-bold text-gray-900">
              {DEMO_WALLET.productName}
            </p>
            <p className="text-xs font-extrabold text-brand-dark">
              {formatBDT(DEMO_WALLET.price)}{' '}
              <span className="font-normal text-gray-400 line-through">
                {formatBDT(DEMO_WALLET.oldPrice)}
              </span>
            </p>
          </div>
        ) : step === 2 ? (
          <div className="space-y-2.5">
            <p className="text-center text-xs font-extrabold text-gray-900">
              লিংক শেয়ার করুন
            </p>
            <div className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-2 text-[10px] text-gray-500">
              orderlinkbd.netlify.app/ডেমো-শপ/ওয়ালেট
            </div>
            <div className="flex gap-2">
              <span className="flex-1 rounded-lg bg-[#1877f2] px-2 py-2 text-center text-[11px] font-bold text-white">
                Facebook
              </span>
              <span className="flex-1 rounded-lg bg-[#25d366] px-2 py-2 text-center text-[11px] font-bold text-white">
                WhatsApp
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-xs font-extrabold text-gray-900">
              Google Sheet
            </p>
            {[
              ['OL-1001', '১,৩১০৳'],
              ['OL-1002', '৮৫০৳'],
              ['OL-1003', '২,২২০৳'],
            ].map(([code, total]) => (
              <div
                key={code}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-2 text-[11px]"
              >
                <span className="font-bold">{code}</span>
                <span className="font-bold text-brand-dark">{total}</span>
              </div>
            ))}
            <p className="text-center text-[10px] text-gray-400">
              আজকের ট্যাবে অটো জমা হয়েছে ✓
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function TemplateMiniCard({
  templateId,
  product,
}: {
  templateId: string
  product: typeof DEMO_WALLET
}) {
  const meta = templateById(
    templateId as Parameters<typeof templateById>[0],
  )
  const dark = meta.dark
  const headerClass =
    templateId === 'offer-special'
      ? 'bg-accent text-white'
      : templateId === 'premium-ecommerce'
        ? 'bg-brand text-white'
        : dark
          ? 'bg-gray-800 text-white'
          : 'bg-gray-100 text-gray-700'
  const bodyClass = dark
    ? 'bg-gray-900'
    : templateId === 'offer-special'
      ? 'bg-red-50'
      : templateId === 'premium-ecommerce'
        ? 'bg-brand-light/60'
        : 'bg-white'
  const discount = discountPercent(product.price, product.oldPrice)
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* ব্রাউজার ফ্রেম */}
      <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-1 min-w-0 flex-1 truncate rounded-md bg-white px-2 py-0.5 text-[10px] text-gray-400">
          orderlinkbd.netlify.app/ডেমো-শপ/…
        </span>
        <span className="shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand-dark">
          প্রিভিউ
        </span>
      </div>
      {/* মিনি পেজ রেন্ডার */}
      <div className={`p-3 ${bodyClass}`}>
        <div
          className={`rounded-lg px-3 py-2 text-xs font-bold ${headerClass}`}
        >
          {meta.nameBn}
        </div>
        <div className="mt-2.5">
          <ProductArt
            product={product}
            className="aspect-[16/10] w-full rounded-xl"
          />
        </div>
        <p
          className={`mt-2.5 text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}
        >
          {product.productName}
        </p>
        <p className="mt-1 text-sm">
          <span
            className={`font-extrabold ${dark ? 'text-white' : 'text-gray-900'}`}
          >
            {formatBDT(product.price)}
          </span>{' '}
          <span className="text-gray-400 line-through">
            {formatBDT(product.oldPrice)}
          </span>{' '}
          {discount > 0 ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
              {toBnDigits(discount)}% ছাড়
            </span>
          ) : null}
        </p>
      </div>
      <div className="border-t border-gray-100 p-4">
        <p className="text-sm font-bold text-gray-900">{meta.nameBn}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          {meta.taglineBn}
        </p>
      </div>
    </article>
  )
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  // প্রাইসিং — সার্ভারের লাইভ ক্যাটালগ থেকে (দাম কখনো কোডে নেই)।
  const [plans, setPlans] = useState<PlanRow[] | null>(null)
  const [plansError, setPlansError] = useState(false)

  useEffect(() => {
    fetchPlans()
      .then((p) => setPlans(p))
      .catch(() => setPlansError(true))
  }, [])

  function loadPlans() {
    setPlansError(false)
    fetchPlans()
      .then((p) => setPlans(p))
      .catch(() => setPlansError(true))
  }

  useEffect(() => {
    if (!menuOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div id="home" className="min-h-screen bg-white text-gray-900">
      {/* ন্যাভবার */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Orderlink হোম"
          >
            <LogoWordmark />
          </button>
          <nav className="hidden items-center gap-5 text-sm font-bold lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-brand-dark underline-offset-4 hover:text-brand hover:underline"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm font-bold text-brand-dark hover:text-brand"
            >
              লগইন
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow"
            >
              দোকান খুলুন
            </button>
          </div>
          <button
            type="button"
            className="rounded-xl border border-gray-300 p-2 text-brand-dark lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="মেনু"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <IconX className="h-5 w-5" />
            ) : (
              <IconMenu className="h-5 w-5" />
            )}
          </button>

          {/* ফোনের ড্রপডাউন কার্ড */}
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default lg:hidden"
                onClick={() => setMenuOpen(false)}
                aria-label="মেনু বন্ধ করুন"
              />
              <div className="animate-fade-up absolute right-4 top-full z-50 mt-2 w-[248px] rounded-2xl border border-gray-200 bg-white p-2 shadow-xl lg:hidden">
                <nav className="flex flex-col text-sm font-bold">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl px-3 py-2.5 text-brand-dark hover:bg-brand-light"
                    >
                      {link.label}
                    </a>
                  ))}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="rounded-xl px-3 py-2.5 text-left text-brand-dark hover:bg-brand-light"
                  >
                    লগইন
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/signup')}
                    className="mt-1 rounded-xl bg-accent px-3 py-2.5 font-bold text-white"
                  >
                    দোকান খুলুন
                  </button>
                </nav>
              </div>
            </>
          ) : null}
        </div>
        <div className="h-0.5 bg-gradient-to-r from-brand to-accent" />
      </header>

      {/* হিরো */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-[#00573f] to-[#003d2c] text-white">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-brand-dark">
              <span className="h-2 w-2 rounded-full bg-accent" />
              অনলাইন সেলারদের জন্য তৈরি
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-5xl">
              ফেসবুক পোস্টে লিংক দিন, অর্ডার আসবে সাজানো ফর্মে
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/85">
              মেসেঞ্জারে নাম-ঠিকানা চাইতে হবে না। প্রতিটি পণ্যের আলাদা অর্ডার
              লিংক বানান।
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="rounded-xl bg-accent px-6 py-3 font-bold text-white shadow-lg"
              >
                দোকান খুলুন
              </button>
              <a
                href="#templates"
                className="rounded-xl border border-white/60 px-6 py-3 font-bold text-white"
              >
                নমুনা দেখুন
              </a>
            </div>
          </div>
          <PhoneMockup />
        </div>
      </section>

      {/* সমস্যার স্ট্রিপ */}
      <section className="dot-bg mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-center text-2xl font-extrabold">
          মেসেঞ্জারে অর্ডার নেওয়ার ঝামেলা চেনা?
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'নাম-ঠিকানা চাইতে হয়',
              text: 'প্রতিটা কাস্টমারের নাম, ফোন, ঠিকানা মেসেঞ্জারে চেয়ে নিতে হয় — সময় যায়।',
            },
            {
              title: 'অর্ডার হারিয়ে যায়',
              text: 'মেসেঞ্জারের ভিড়ে অর্ডার চাপা পড়ে — কে কী অর্ডার দিল, খুঁজে পাওয়া মুশকিল।',
            },
            {
              title: 'হিসাব মেলাতে কষ্ট',
              text: 'খাতায় বা মনে হিসাব রাখতে হয় — দিনের শেষে মেলাতে সময় নষ্ট।',
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h3 className="font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* কীভাবে কাজ করে — স্লাইডার */}
      <section id="how" className="bg-gray-50 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-sm font-bold text-brand">
            মাত্র ৪ ধাপে শুরু করুন
          </p>
          <h2 className="mt-2 text-center text-2xl font-extrabold">
            কীভাবে কাজ করে
          </h2>
          {/* ডেস্কটপ: পাশের ধাপের তালিকা + বিস্তারিত + ফোন ভিজ্যুয়াল */}
          <div className="mt-8 hidden gap-6 md:grid md:grid-cols-3">
            <ol className="space-y-3">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(i)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      activeStep === i
                        ? 'border-brand bg-brand-light shadow-sm'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="text-sm font-bold text-brand">
                      ধাপ {toBnDigits(i + 1)}
                    </span>
                    <span className="block font-bold">{step.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="col-span-2 flex items-center gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-extrabold">
                  {STEPS[activeStep].title}
                </h3>
                <p className="mt-3 leading-relaxed text-gray-600">
                  {STEPS[activeStep].text}
                </p>
              </div>
              <StepPhone step={activeStep} />
            </div>
          </div>
          {/* ফোন: শুধু সক্রিয় ধাপ + ফোন ভিজ্যুয়াল + আগের/পরের + ডট */}
          <div className="mt-8 md:hidden">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <StepPhone step={activeStep} />
              <p className="mt-5 text-center text-sm font-bold text-brand">
                ধাপ {toBnDigits(activeStep + 1)} / {toBnDigits(STEPS.length)}
              </p>
              <h3 className="mt-1 text-center text-xl font-extrabold">
                {STEPS[activeStep].title}
              </h3>
              <p className="mt-3 text-center leading-relaxed text-gray-600">
                {STEPS[activeStep].text}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={activeStep === 0}
                onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
              >
                ← আগের
              </button>
              <div className="flex gap-2">
                {STEPS.map((step, i) => (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setActiveStep(i)}
                    aria-label={`ধাপ ${toBnDigits(i + 1)}`}
                    className={`h-2.5 w-2.5 rounded-full ${
                      activeStep === i ? 'bg-brand' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                disabled={activeStep === STEPS.length - 1}
                onClick={() =>
                  setActiveStep((s) => Math.min(STEPS.length - 1, s + 1))
                }
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
              >
                পরের →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ফিচার */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-center text-2xl font-extrabold">যা যা পাবেন</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-mint text-brand-dark">
                {f.icon}
              </span>
              <h3 className="mt-3 font-extrabold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {f.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* টেমপ্লেট গ্যালারি — ঠিক ৪টি */}
      <section id="templates" className="bg-gray-50 py-12">
        <div className="mx-auto max-w-[1320px] px-4">
          <h2 className="text-center text-2xl font-extrabold">
            পেজের ডিজাইন বাছুন
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            বিল্ডারে মোট ৮টি টেমপ্লেট — এখানে ৪টির নমুনা।
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INTRO_TEMPLATES.map((id, i) => (
              <TemplateMiniCard
                key={id}
                templateId={id}
                product={GALLERY_PRODUCTS[i % GALLERY_PRODUCTS.length]}
              />
            ))}
          </div>
        </div>
      </section>

      {/* প্রাইসিং */}
      <section id="pricing" className="bg-cream py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-extrabold">
            একটাই সহজ মাসিক প্ল্যান
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            এক পেমেন্টে ৩০ দিনের পুরো অ্যাক্সেস — কোনো পেজ ক্রেডিট, আলাদা
            হোস্টিং ফি, অর্ডারপ্রতি চার্জ বা কমিশন নেই।
          </p>
          {plans === null && !plansError ? (
            <p className="mt-8 text-center text-sm text-gray-600">
              প্রাইসিং লোড হচ্ছে…
            </p>
          ) : plansError || !plans ? (
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
              <p className="text-sm font-bold text-gray-700">
                প্রাইসিং এখন লোড করা যায়নি।
              </p>
              <button
                type="button"
                onClick={loadPlans}
                className="mt-3 rounded-xl bg-gradient-to-r from-brand-dark to-brand px-4 py-2.5 text-sm font-bold text-white shadow"
              >
                আবার চেষ্টা করুন
              </button>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((pkg) => (
                <article
                  key={pkg.id}
                  className={`relative rounded-2xl border p-5 ${
                    pkg.is_recommended
                      ? 'border-brand bg-brand-light shadow-md'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {pkg.is_recommended ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-0.5 text-xs font-bold text-white">
                      সবচেয়ে জনপ্রিয়
                    </span>
                  ) : null}
                  <h3 className="font-extrabold">{pkg.name}</h3>
                  <p className="mt-2">
                    <span className="text-3xl font-extrabold">
                      {formatBDT(pkg.price_bdt)}
                    </span>
                    <span className="text-sm text-gray-500"> / মাস</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-1.5">
                      <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {toBnDigits(pkg.max_pages)}টি ল্যান্ডিং পেজ
                    </li>
                    <li className="flex items-start gap-1.5">
                      <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {storageLabel(pkg.storage_mb)} ছবির স্টোরেজ
                    </li>
                    {pkg.features_bn.slice(2).map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => navigate('/signup')}
                    className="mt-5 w-full rounded-xl bg-accent px-4 py-2.5 font-bold text-white shadow"
                  >
                    শুরু করুন
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="dot-bg bg-gray-50 py-12">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-brand to-accent" />
          <h2 className="mt-4 text-center text-2xl font-extrabold">জিজ্ঞাসা</h2>
          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <article
                key={item.q}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left font-bold"
                >
                  {item.q}
                  <span className="text-brand">
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i ? (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-gray-600">
                    {item.a}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ফাইনাল CTA */}
      <section className="bg-white px-4 py-14">
        <div className="animate-gradient-pan mx-auto max-w-[880px] rounded-[32px] bg-gradient-to-r from-brand-dark via-brand to-accent px-6 py-12 text-center text-white shadow-xl">
          <h2 className="text-2xl font-extrabold md:text-3xl">
            আজই আপনার দোকান খুলুন
          </h2>
          <p className="mt-2 text-white/85">
            ফ্রি অ্যাকাউন্ট খুলে প্রথম পেজটা বানিয়ে ফেলুন।
          </p>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="mt-6 rounded-xl bg-white px-8 py-3 font-bold text-brand-dark shadow-lg"
          >
            দোকান খুলুন
          </button>
        </div>
      </section>

      {/* ফুটার */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="h-0.5 bg-gradient-to-r from-brand via-accent to-brand" />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div>
            <img
              src="/orderlink-logo-tile.png"
              alt="Orderlink"
              className="h-9 w-auto"
            />
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              ফেসবুক সেলারদের জন্য ল্যান্ডিং পেজ ও অটো অর্ডার সিস্টেম।
            </p>
          </div>
          <div>
            <p className="font-bold text-white">পেজ</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/about')}
                  className="hover:text-white"
                >
                  আমাদের সম্পর্কে
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/contact')}
                  className="hover:text-white"
                >
                  যোগাযোগ
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/help')}
                  className="hover:text-white"
                >
                  সাহায্য কেন্দ্র
                </button>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-white">আইনি</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/privacy')}
                  className="hover:text-white"
                >
                  গোপনীয়তা নীতি
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="hover:text-white"
                >
                  শর্তাবলী
                </button>
              </li>
              <li>
                <a
                  href="mailto:xolvekart@gmail.com"
                  className="hover:text-white"
                >
                  xolvekart@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs text-gray-500">
          © ২০২৬ Orderlink — সর্বস্বত্ব সংরক্ষিত।
        </p>
      </footer>
    </div>
  )
}
