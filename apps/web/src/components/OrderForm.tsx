// কাস্টমার পেজের আসল অর্ডার ফর্ম — নাম, ফোন, ঠিকানা (বিভাগ/জেলা),
// ডেলিভারি এলাকা ও লাইভ মোট। লগইন লাগে না। ডেলিভারি চার্জ
// শুধু দোকানের সেটিংস থেকে; ফ্রি-ডেলিভারি সীমা থাকলে আসল হিসাবেই
// প্রয়োগ হয়। একই ফোনে ২৪ ঘণ্টায় অর্ডার থাকলে নরম সতর্কতা দেখায়
// (আটকায় না — কাস্টমার নিশ্চিত করলে জমা হয়)।
import { useState } from 'react'
import type { FormEvent } from 'react'
import { formatBDT, toBnDigits } from '../lib/pricing.ts'
import {
  DIVISIONS,
  DIVISION_DISTRICTS,
  deliveryChargeFor,
  findRecentOrderByPhone,
  isValidPhoneBD,
  normalizePhoneBD,
  orderTotal,
  placeOrder,
} from '../lib/orders.ts'
import { triggerOrderSync } from '../lib/sheets.ts'
import type { CustomerPageData } from '../lib/types.ts'
import type { CustomerStrings as StringsType } from '../lib/i18n.ts'

export interface PlacedOrder {
  orderCode: string
  total: number
  quantity: number
  customerName: string
}

export default function OrderForm({
  data,
  t,
  onPlaced,
  dark = false,
  accent = '#D6B36A',
  accentText = '#0B0B0D',
  lightAccent,
}: {
  data: CustomerPageData
  t: StringsType
  onPlaced: (placed: PlacedOrder) => void
  /** Luxury Premium টেমপ্লেটের গাঢ় সোনালি রূপ — অন্য টেমপ্লেটে বদলায় না। */
  dark?: boolean
  /** গাঢ় রূপে CTA ও বাছাই করা ডেলিভারি এলাকার রং (ডিফল্ট সোনালি)। */
  accent?: string
  accentText?: string
  /** হালকা থিমে CTA ও বাছাই করা ডেলিভারি এলাকার রং (শুধু Beauty টেমপ্লেট দেয়)। */
  lightAccent?: string
}) {
  const { shop, product } = data
  // গাঢ় থিমের ইনপুট/লেবেল — হালকা থিমের ক্লাস একদম আগের মতো।
  const labelClass = dark
    ? 'text-sm font-semibold text-[#B8B8B8]'
    : 'text-sm font-semibold text-gray-700'
  const inputClass = dark
    ? 'mt-1 w-full rounded-xl border border-[#34343A] bg-[#151518] px-3.5 py-2.5 text-sm text-white transition placeholder:text-[#8a8a90] focus:border-[#D6B36A] focus:outline-none focus:ring-2 focus:ring-[#D6B36A]/30'
    : 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25'
  // সিলেক্টের নিজের ক্লাস — ইনপুটের মতোই, তবে নেটিভ তির সরিয়ে নিজের
  // চেভরন বসে (নিচের র‍্যাপারে); বন্ধ অবস্থায় স্পষ্ট ধূসর হয়।
  const selectClass = dark
    ? 'w-full appearance-none rounded-xl border border-[#34343A] bg-[#151518] px-3.5 py-2.5 pr-10 text-sm text-white transition focus:border-[#D6B36A] focus:outline-none focus:ring-2 focus:ring-[#D6B36A]/30 disabled:cursor-not-allowed disabled:opacity-50'
    : 'w-full appearance-none rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-70'
  const chevron = (
    <svg
      className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
        dark ? 'text-[#8a8a90]' : 'text-gray-400'
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
  // গ্রুপ প্যানেল — যোগাযোগ / ঠিকানা / ডেলিভারি আলাদা কার্ডে সাজে।
  // নম্বরযুক্ত শিরোনাম (১/২/৩) সহ, যাতে ধাপগুলো এক নজরে চোখে পড়ে।
  const groupClass = dark
    ? 'rounded-2xl border border-[#34343A] bg-[#151518]/60 p-5 shadow-sm'
    : 'rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm'
  const badgeStyle =
    dark
      ? { backgroundColor: accent, color: accentText }
      : lightAccent
        ? { backgroundColor: lightAccent, color: '#FFFFFF' }
        : undefined
  const badgeClass = `flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
    dark || lightAccent ? '' : 'bg-brand text-white'
  }`
  const sectionTitleClass = `text-[15px] font-extrabold ${
    dark ? 'text-white' : 'text-gray-900'
  }`
  function SectionHead({ step, title }: { step: number; title: string }) {
    return (
      <div className="mb-4 flex items-center gap-2.5">
        <span className={badgeClass} style={badgeStyle}>
          {toBnDigits(step)}
        </span>
        <span className={sectionTitleClass}>{title}</span>
      </div>
    )
  }
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [division, setDivision] = useState('')
  const [district, setDistrict] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [area, setArea] = useState<'inside' | 'outside'>('inside')
  // পরিমাণ — ফর্মের নিজের (লাইভ অ্যাপের মতো, হিরোতে সিলেক্টর নেই)।
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [duplicate, setDuplicate] = useState<{
    code: string
    confirmed: boolean
  } | null>(null)

  const unitPrice = Number(product.price)
  const subtotal = unitPrice * quantity
  const deliveryCharge = deliveryChargeFor(shop, area, subtotal)
  const total = orderTotal(unitPrice, quantity, deliveryCharge)
  const districts = division ? (DIVISION_DISTRICTS[division] ?? []) : []
  const freeThreshold =
    shop.free_delivery_threshold !== null &&
    shop.free_delivery_threshold > 0
      ? Number(shop.free_delivery_threshold)
      : null

  function handleDivisionChange(value: string) {
    setDivision(value)
    setDistrict('')
  }

  function changeQuantity(delta: number) {
    setQuantity((q) => Math.min(99, Math.max(1, q + delta)))
  }

  async function submit(confirmDuplicate: boolean) {
    setError('')
    if (!name.trim()) {
      setError(t.requiredField)
      return
    }
    const normalizedPhone = normalizePhoneBD(phone)
    if (!isValidPhoneBD(normalizedPhone)) {
      setError(t.invalidPhone)
      return
    }
    if (!division) {
      setError(t.requiredField)
      return
    }
    if (!district) {
      setError(t.requiredField)
      return
    }
    if (!addressLine.trim()) {
      setError(t.requiredField)
      return
    }
    const phoneValue = normalizedPhone as string
    setBusy(true)
    try {
      if (!confirmDuplicate) {
        // ডুপ্লিকেট যাচাই শুধু সতর্কতা — এটা ব্যর্থ হলে (যেমন মাইগ্রেশন
        // এখনো লাইভে চালানো হয়নি) অর্ডার আটকাবে না, সতর্কতা ছাড়াই যাবে।
        try {
          const recent = await findRecentOrderByPhone(shop.id, phoneValue)
          if (recent) {
            setDuplicate({ code: recent.orderCode, confirmed: false })
            setBusy(false)
            return
          }
        } catch {
          // নরম সতর্কতা ব্যর্থ — অর্ডার চালিয়ে যান।
        }
      }
      const placed = await placeOrder({
        shop,
        product,
        customerName: name,
        customerPhone: phoneValue,
        division,
        district,
        upazila: '', // আলাদা উপজেলা বক্স নেই — কাস্টমার উপজেলা ঠিকানার বক্সেই লেখে।
        addressLine,
        deliveryArea: area,
        quantity,
      })
      // Sheet সিঙ্ক ফায়ার-অ্যান্ড-ফরগেট — সিঙ্ক ব্যর্থ হলেও অর্ডার
      // আটকায় না; কিউ থেকে রিট্রাই হবে। id না থাকলে (ফলব্যাক পথে)
      // ডাকা হয় না — সারি pending থাকায় রিট্রাই তুলে নেবে।
      if (placed.id) triggerOrderSync(placed.id)
      onPlaced({
        orderCode: placed.orderCode,
        total,
        quantity,
        customerName: name.trim(),
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'অর্ডার দেওয়া যায়নি — আবার চেষ্টা করুন।',
      )
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void submit(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {duplicate && !duplicate.confirmed ? (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>{t.duplicateWarning(duplicate.code)}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDuplicate({ code: duplicate.code, confirmed: true })
                void submit(true)
              }}
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t.confirmAnyway}
            </button>
            <button
              type="button"
              onClick={() => setDuplicate(null)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
            >
              {t.backToForm}
            </button>
          </div>
        </div>
      ) : null}

      <div className={`${groupClass} space-y-4`}>
        <SectionHead step={1} title={t.formContact} />
        <label className="block">
          <span className={labelClass}>{t.yourName} *</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="যেমন: রহিম উদ্দিন"
          />
        </label>

        <label className="block">
          <span className={labelClass}>{t.phone} *</span>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="01XXXXXXXXX"
          />
        </label>
      </div>

      <div className={`${groupClass} space-y-4`}>
      <SectionHead step={2} title={t.formAddress} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>{t.division} *</span>
          <div className="relative mt-1">
            <select
              required
              value={division}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className={selectClass}
            >
              <option value="">{t.selectDivision}</option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {chevron}
          </div>
        </label>
        <label className="block">
          <span className={labelClass}>{t.district} *</span>
          <div className="relative mt-1">
            <select
              required
              value={district}
              disabled={!division}
              onChange={(e) => setDistrict(e.target.value)}
              className={selectClass}
            >
              <option value="">
                {!division ? t.selectDivisionFirst : t.selectDistrict}
              </option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {chevron}
          </div>
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>{t.addressLine} *</span>
        <textarea
          required
          rows={2}
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          className={inputClass}
          placeholder="উপজেলা, বাড়ি/ফ্ল্যাট, রোড, এলাকা"
        />
      </label>
      </div>

      <div className={`${groupClass} space-y-4`}>
      <SectionHead step={3} title={t.formDelivery} />
      <fieldset>
        <legend className={labelClass}>
          {t.deliveryArea} *
        </legend>
        <div className="mt-2 flex gap-2">
          {(
            [
              ['inside', t.insideDhaka],
              ['outside', t.outsideDhaka],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setArea(value)}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold shadow-sm transition ${
                area === value
                  ? dark
                    ? 'border-transparent'
                    : lightAccent
                      ? 'border-transparent text-white'
                      : 'border-brand bg-brand text-white'
                  : dark
                    ? 'border-[#34343A] bg-[#151518] text-white hover:border-[#55555c]'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
              style={
                area === value && dark
                  ? { backgroundColor: accent, color: accentText, borderColor: accent }
                  : area === value && lightAccent
                    ? { backgroundColor: lightAccent, color: '#FFFFFF', borderColor: lightAccent }
                    : undefined
              }
            >
              {label}
              <span className="block text-xs font-normal opacity-80">
                {Number(
                  value === 'inside'
                    ? shop.delivery_inside_charge
                    : shop.delivery_outside_charge,
                ) > 0
                  ? formatBDT(
                      Number(
                        value === 'inside'
                          ? shop.delivery_inside_charge
                          : shop.delivery_outside_charge,
                      ),
                    )
                  : t.freeDelivery}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center justify-between">
        <span className={labelClass}>{t.quantity}</span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeQuantity(-1)}
            disabled={quantity <= 1}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg font-bold transition disabled:opacity-40 ${dark ? 'border-[#34343A] bg-[#151518] text-white hover:border-[#55555c]' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}`}
            aria-label="কম"
          >
            −
          </button>
          <span className={`w-10 text-center text-lg font-extrabold ${dark ? 'text-white' : 'text-gray-900'}`}>
            {toBnDigits(quantity)}
          </span>
          <button
            type="button"
            onClick={() => changeQuantity(1)}
            disabled={quantity >= 99}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg font-bold transition disabled:opacity-40 ${dark ? 'border-[#34343A] bg-[#151518] text-white hover:border-[#55555c]' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}`}
            aria-label="বেশি"
          >
            +
          </button>
        </span>
      </div>
      </div>

      <div
        className={`space-y-1.5 rounded-2xl border px-4 py-3.5 text-sm shadow-sm ${
          dark
            ? 'border-[#34343A] bg-[#151518]'
            : 'border-gray-200 bg-gray-50'
        }`}
      >
        <p className={`pb-1 ${sectionTitleClass}`}>{t.formSummary}</p>
        <p className="flex justify-between">
          <span className={dark ? 'text-[#B8B8B8]' : 'text-gray-600'}>
            {t.subtotal} (× {toBnDigits(quantity)})
          </span>
          <span className={`font-semibold ${dark ? 'text-white' : ''}`}>
            {formatBDT(subtotal)}
          </span>
        </p>
        <p className="flex justify-between">
          <span className={dark ? 'text-[#B8B8B8]' : 'text-gray-600'}>
            {t.deliveryCharge}
          </span>
          <span className={`font-semibold ${dark ? 'text-white' : ''}`}>
            {deliveryCharge > 0 ? formatBDT(deliveryCharge) : t.freeDelivery}
          </span>
        </p>
        {freeThreshold !== null && deliveryCharge === 0 ? (
          <p
            className="text-xs font-semibold text-brand"
            style={lightAccent ? { color: lightAccent } : undefined}
          >
            {t.freeDeliveryApplies}
          </p>
        ) : null}
        {freeThreshold !== null && deliveryCharge > 0 ? (
          <p className="text-xs text-gray-500">
            {t.freeDeliveryAbove(formatBDT(freeThreshold))}
          </p>
        ) : null}
        <p
          className={`flex justify-between border-t pt-2 text-base font-extrabold ${
            dark ? 'border-[#34343A] text-white' : 'border-gray-200'
          }`}
        >
          <span>{t.total}</span>
          <span>{formatBDT(total)}</span>
        </p>
      </div>

      <button
        type="submit"
        disabled={busy}
        className={`w-full rounded-xl px-4 py-3.5 text-base font-bold shadow-md transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 ${
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
        {busy ? t.placingOrder : `${t.placeOrder} — ${formatBDT(total)}`}
      </button>

      {data.sellerWhatsapp ? (
        <a
          href={`https://wa.me/${data.sellerWhatsapp}?text=${encodeURIComponent(
            `আমি "${product.name}" অর্ডার করতে চাই।`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className={`block rounded-xl border px-4 py-3 text-center text-sm font-semibold transition ${dark ? 'border-[#34343A] text-white hover:border-[#55555c] hover:bg-[#1d1d21]' : 'border-gray-300 text-gray-700 hover:border-[#25d366] hover:bg-[#25d366]/5 hover:text-[#128c4b]'}`}
        >
          {t.whatsappOrder}
        </a>
      ) : null}
    </form>
  )
}
