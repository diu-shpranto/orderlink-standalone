// হোম পেজ — লাইভ Orderlink অ্যাপের হোমের রেপ্লিকা।
// সাদা ন্যাভবার, গাঢ় সবুজ হিরো, ফোন মকআপ (ডেমো শপ + ওয়ালেট),
// সমস্যার স্ট্রিপ, ৪ ধাপের স্লাইডার (ফোনে শুধু সক্রিয় ধাপ),
// ৬ ফিচার, টেমপ্লেট গ্যালারি (ঠিক ৪টি), প্রাইসিং (৪ প্যাকেজ),
// ৫ প্রশ্নের FAQ, সবুজ ফাইনাল CTA, ফুটার।
// কোনো ভুয়া পরিসংখ্যান নেই — সংখ্যা শুধু প্যাকেজের দাম/সীমা।
import { useState } from 'react'
import { LogoWordmark } from '../components/Logo.tsx'
import { PACKAGES, storageLabel } from '../lib/catalog.ts'
import { discountPercent, formatBDT, toBnDigits } from '../lib/pricing.ts'
import { navigate } from '../lib/router.ts'
import { INTRO_TEMPLATES, templateById } from '../lib/templates.ts'

const DEMO = {
  shopName: 'ডেমো শপ',
  productName: 'প্রিমিয়াম লেদার ওয়ালেট',
  price: 850,
  oldPrice: 1200,
}

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
  },
  {
    title: 'Google Sheet অটো-সিঙ্ক',
    text: 'অর্ডার এলেই আপনার Sheet-এ সারি যোগ হয় — হাতে লিখতে হয় না।',
  },
  {
    title: 'অর্ডার ব্যবস্থাপনা',
    text: 'অর্ডারের স্ট্যাটাস, ফোনে কল, হিসাব — সব এক জায়গায়।',
  },
  {
    title: '৮টি টেমপ্লেট',
    text: 'পণ্য অনুযায়ী ডিজাইন বাছুন — সাদা, অফার, প্রিমিয়াম, ডার্ক।',
  },
  {
    title: 'মোবাইল-ফ্রেন্ডলি',
    text: 'কাস্টমারের ফোনে পেজ নিখুঁত দেখায় — অর্ডার ফর্মও ফোনে সহজ।',
  },
  {
    title: 'সহজ মাসিক প্ল্যান',
    text: 'এক পেমেন্টে ৩০ দিনের পুরো অ্যাক্সেস — কোনো লুকানো চার্জ নেই।',
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

function PhoneMockup() {
  const discount = discountPercent(DEMO.price, DEMO.oldPrice)
  return (
    <div className="relative mx-auto w-64 rotate-2 rounded-[2rem] border-4 border-gray-900 bg-white shadow-2xl sm:w-72">
      <div className="mx-auto mt-2 h-4 w-20 rounded-full bg-gray-900" />
      <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
        <span className="flex items-center gap-2 font-bold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">
            ড
          </span>
          {DEMO.shopName}
        </span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">নমুনা</span>
      </div>
      <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-amber-100 to-amber-300">
        <span className="px-4 text-center text-sm font-bold text-amber-900">
          {DEMO.productName}
        </span>
      </div>
      <div className="p-4">
        <p className="font-bold text-gray-900">{DEMO.productName}</p>
        <p className="mt-1">
          <span className="text-lg font-extrabold text-gray-900">
            {formatBDT(DEMO.price)}
          </span>{' '}
          <span className="text-sm text-gray-400 line-through">
            {formatBDT(DEMO.oldPrice)}
          </span>{' '}
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
            {toBnDigits(discount)}% ছাড়
          </span>
        </p>
        <span className="mt-3 block rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white">
          অর্ডার করুন
        </span>
      </div>
    </div>
  )
}

function TemplateMiniCard({ templateId }: { templateId: string }) {
  const meta = templateById(
    templateId as Parameters<typeof templateById>[0],
  )
  const dark = meta.dark
  return (
    <article
      className={`overflow-hidden rounded-2xl border shadow-sm ${
        dark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
      }`}
    >
      <div
        className={`px-4 py-2 text-xs font-bold ${
          templateId === 'offer-special'
            ? 'bg-accent text-white'
            : templateId === 'premium-ecommerce'
              ? 'bg-brand text-white'
              : dark
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-700'
        }`}
      >
        {meta.nameBn}
      </div>
      <div
        className={`flex aspect-[4/3] items-center justify-center ${
          templateId === 'offer-special'
            ? 'bg-red-50'
            : templateId === 'premium-ecommerce'
              ? 'bg-brand-light'
              : dark
                ? 'bg-gray-800'
                : 'bg-gray-50'
        }`}
      >
        <span
          className={`px-4 text-center text-sm font-bold ${
            dark ? 'text-gray-200' : 'text-gray-700'
          }`}
        >
          {DEMO.productName}
        </span>
      </div>
      <div className="p-4">
        <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
          {DEMO.productName}
        </p>
        <p className="mt-1 text-sm">
          <span className={`font-extrabold ${dark ? 'text-white' : 'text-gray-900'}`}>
            {formatBDT(DEMO.price)}
          </span>{' '}
          <span className="text-gray-400 line-through">
            {formatBDT(DEMO.oldPrice)}
          </span>
        </p>
        <p className={`mt-2 text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
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

  return (
    <div id="home" className="min-h-screen bg-white text-gray-900">
      {/* ন্যাভবার */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button type="button" onClick={() => navigate('/')} aria-label="Orderlink হোম">
            <LogoWordmark />
          </button>
          <nav className="hidden items-center gap-5 text-sm font-medium lg:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-gray-700 hover:text-brand">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-gray-700 hover:text-brand"
            >
              লগইন
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              দোকান খুলুন
            </button>
          </div>
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-2 text-sm lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="মেনু"
          >
            ☰
          </button>
        </div>
        {menuOpen ? (
          <div className="border-t border-gray-200 bg-white px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-3 text-sm">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-gray-700"
                >
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-left font-semibold text-gray-700"
              >
                লগইন
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="rounded-lg bg-accent px-4 py-2 font-semibold text-white"
              >
                দোকান খুলুন
              </button>
            </nav>
          </div>
        ) : null}
        <div className="h-0.5 bg-gradient-to-r from-brand to-accent" />
      </header>

      {/* হিরো */}
      <section className="bg-gradient-to-br from-brand via-[#00573f] to-[#003d2c] text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand-dark">
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
                className="rounded-lg bg-accent px-6 py-3 font-semibold text-white"
              >
                দোকান খুলুন
              </button>
              <a
                href="#templates"
                className="rounded-lg border border-white/60 px-6 py-3 font-semibold text-white"
              >
                নমুনা দেখুন
              </a>
            </div>
          </div>
          <PhoneMockup />
        </div>
      </section>

      {/* সমস্যার স্ট্রিপ */}
      <section className="mx-auto max-w-6xl px-4 py-12">
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
              className="rounded-2xl border border-gray-200 bg-white p-5"
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
          {/* ডেস্কটপ: পাশের ধাপের তালিকা + বিস্তারিত */}
          <div className="mt-8 hidden gap-6 md:grid md:grid-cols-3">
            <ol className="space-y-3">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(i)}
                    className={`w-full rounded-xl border p-4 text-left ${
                      activeStep === i
                        ? 'border-brand bg-brand-light'
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
            <div className="col-span-2 rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="text-xl font-bold">{STEPS[activeStep].title}</h3>
              <p className="mt-3 leading-relaxed text-gray-600">
                {STEPS[activeStep].text}
              </p>
            </div>
          </div>
          {/* ফোন: শুধু সক্রিয় ধাপ + আগের/পরের + ডট */}
          <div className="mt-8 md:hidden">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-bold text-brand">
                ধাপ {toBnDigits(activeStep + 1)} / {toBnDigits(STEPS.length)}
              </p>
              <h3 className="mt-1 text-xl font-bold">
                {STEPS[activeStep].title}
              </h3>
              <p className="mt-3 leading-relaxed text-gray-600">
                {STEPS[activeStep].text}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={activeStep === 0}
                onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
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
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
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
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {f.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* টেমপ্লেট গ্যালারি — ঠিক ৪টি */}
      <section id="templates" className="bg-gray-50 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-extrabold">
            পেজের ডিজাইন বাছুন
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            বিল্ডারে মোট ৮টি টেমপ্লেট — এখানে ৪টির নমুনা।
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INTRO_TEMPLATES.map((id) => (
              <TemplateMiniCard key={id} templateId={id} />
            ))}
          </div>
        </div>
      </section>

      {/* প্রাইসিং */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-center text-2xl font-extrabold">
          একটাই সহজ মাসিক প্ল্যান
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          এক পেমেন্টে ৩০ দিনের পুরো অ্যাক্সেস — কোনো পেজ ক্রেডিট, আলাদা
          হোস্টিং ফি, অর্ডারপ্রতি চার্জ বা কমিশন নেই।
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGES.map((pkg) => (
            <article
              key={pkg.id}
              className={`relative rounded-2xl border p-5 ${
                pkg.recommended
                  ? 'border-brand bg-brand-light shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {pkg.recommended ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-xs font-bold text-white">
                  সবচেয়ে জনপ্রিয়
                </span>
              ) : null}
              <h3 className="font-bold">{pkg.nameBn}</h3>
              <p className="mt-2">
                <span className="text-3xl font-extrabold">
                  {formatBDT(pkg.price)}
                </span>
                <span className="text-sm text-gray-500"> / মাস</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                <li>✓ {toBnDigits(pkg.pages)}টি ল্যান্ডিং পেজ</li>
                <li>✓ {storageLabel(pkg.storageMb)} ছবির স্টোরেজ</li>
                {pkg.featuresBn.slice(2).map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-white"
              >
                শুরু করুন
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-gray-50 py-12">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center text-2xl font-extrabold">জিজ্ঞাসা</h2>
          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <article
                key={item.q}
                className="rounded-2xl border border-gray-200 bg-white"
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
      <section className="bg-brand py-14 text-center text-white">
        <h2 className="px-4 text-2xl font-extrabold md:text-3xl">
          আজই আপনার দোকান খুলুন
        </h2>
        <p className="mt-2 px-4 text-white/85">
          ফ্রি অ্যাকাউন্ট খুলে প্রথম পেজটা বানিয়ে ফেলুন।
        </p>
        <button
          type="button"
          onClick={() => navigate('/signup')}
          className="mt-6 rounded-lg bg-accent px-8 py-3 font-semibold text-white"
        >
          দোকান খুলুন
        </button>
      </section>

      {/* ফুটার */}
      <footer className="bg-gray-900 py-10 text-gray-300">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
          <div>
            <p className="text-xl font-extrabold">
              <span className="text-white">Order</span>
              <span className="text-accent">link</span>
            </p>
            <p className="mt-2 text-sm text-gray-400">
              ফেসবুক সেলারদের জন্য ল্যান্ডিং পেজ ও অটো অর্ডার সিস্টেম।
            </p>
          </div>
          <div>
            <p className="font-bold text-white">পেজ</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button type="button" onClick={() => navigate('/about')} className="hover:text-white">
                  আমাদের সম্পর্কে
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/contact')} className="hover:text-white">
                  যোগাযোগ
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/help')} className="hover:text-white">
                  সাহায্য কেন্দ্র
                </button>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-white">আইনি</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button type="button" onClick={() => navigate('/privacy')} className="hover:text-white">
                  গোপনীয়তা নীতি
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/terms')} className="hover:text-white">
                  শর্তাবলী
                </button>
              </li>
              <li>
                <a href="mailto:xolvekart@gmail.com" className="hover:text-white">
                  xolvekart@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-gray-500">
          © ২০২৬ Orderlink — সর্বস্বত্ব সংরক্ষিত।
        </p>
      </footer>
    </div>
  )
}
