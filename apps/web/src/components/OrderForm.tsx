// কাস্টমার পেজের আসল অর্ডার ফর্ম — নাম, ফোন, ঠিকানা (বিভাগ/জেলা/
// উপজেলা), ডেলিভারি এলাকা ও লাইভ মোট। লগইন লাগে না। ডেলিভারি চার্জ
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
  quantity: controlledQuantity,
  onQuantityChange,
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
  /** হিরোর পরিমাণ সিলেক্টরের সাথে সিঙ্ক করা পরিমাণ (না দিলে ফর্ম নিজে রাখে)। */
  quantity?: number
  /** নিয়ন্ত্রিত পরিমাণ বদলালে কল হয়। */
  onQuantityChange?: (quantity: number) => void
}) {
  const { shop, product } = data
  // গাঢ় থিমের ইনপুট/লেবেল — হালকা থিমের ক্লাস একদম আগের মতো।
  const labelClass = dark
    ? 'text-sm font-semibold text-[#B8B8B8]'
    : 'text-sm font-semibold text-gray-700'
  const inputClass = dark
    ? 'mt-1 w-full rounded-lg border border-[#34343A] bg-[#151518] px-3 py-2 text-sm text-white placeholder:text-[#8a8a90]'
    : 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [division, setDivision] = useState('')
  const [district, setDistrict] = useState('')
  const [upazila, setUpazila] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [area, setArea] = useState<'inside' | 'outside'>('inside')
  // পরিমাণ — হিরো থেকে নিয়ন্ত্রিত হলে বাইরের মানটাই চলে, না হলে ফর্মের নিজের।
  const [internalQuantity, setInternalQuantity] = useState(1)
  const quantity = controlledQuantity ?? internalQuantity
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
    const next = Math.min(99, Math.max(1, quantity + delta))
    if (onQuantityChange) onQuantityChange(next)
    else setInternalQuantity(next)
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
        upazila: upazila.trim(),
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
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
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

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>{t.division} *</span>
          <select
            required
            value={division}
            onChange={(e) => handleDivisionChange(e.target.value)}
            className={inputClass}
          >
            <option value="">{t.selectDivision}</option>
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>{t.district} *</span>
          <select
            required
            value={district}
            disabled={!division}
            onChange={(e) => setDistrict(e.target.value)}
            className={inputClass}
          >
            <option value="">{t.selectDistrict}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>{t.upazila}</span>
        <input
          type="text"
          value={upazila}
          onChange={(e) => setUpazila(e.target.value)}
          className={inputClass}
          placeholder="যেমন: সাভার"
        />
      </label>

      <label className="block">
        <span className={labelClass}>{t.addressLine} *</span>
        <textarea
          required
          rows={2}
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          className={inputClass}
          placeholder="বাড়ি/ফ্ল্যাট, রোড, এলাকা"
        />
      </label>

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
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                area === value
                  ? dark
                    ? 'border-transparent'
                    : lightAccent
                      ? 'border-transparent text-white'
                      : 'border-brand bg-brand text-white'
                  : dark
                    ? 'border-[#34343A] bg-[#151518] text-white'
                    : 'border-gray-300 bg-white text-gray-700'
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
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => changeQuantity(-1)}
            disabled={quantity <= 1}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg font-bold disabled:opacity-40 ${dark ? 'border-[#34343A] text-white' : 'border-gray-300'}`} 
            aria-label="কম"
          >
            −
          </button>
          <span className={`w-8 text-center text-lg font-bold ${dark ? 'text-white' : ''}`}>
            {toBnDigits(quantity)}
          </span>
          <button
            type="button"
            onClick={() => changeQuantity(1)}
            disabled={quantity >= 99}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg font-bold disabled:opacity-40 ${dark ? 'border-[#34343A] text-white' : 'border-gray-300'}`} 
            aria-label="বেশি"
          >
            +
          </button>
        </span>
      </div>

      <div
        className={`space-y-1 rounded-xl px-4 py-3 text-sm ${
          dark ? 'border border-[#34343A] bg-[#151518]' : 'bg-gray-50'
        }`}
      >
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
        {product.old_price && product.old_price > product.price ? (
          <p className="flex justify-between">
            <span className={dark ? 'text-[#B8B8B8]' : 'text-gray-600'}>
              {t.off} (× {toBnDigits(quantity)})
            </span>
            <span
              className={`font-semibold ${dark ? 'text-[#4ADE80]' : 'text-brand'}`}
            >
              −{formatBDT((product.old_price - product.price) * quantity)}
            </span>
          </p>
        ) : null}
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
        className={`w-full rounded-lg px-4 py-3 font-semibold disabled:opacity-50 ${
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
          className={`block rounded-lg border px-4 py-3 text-center text-sm font-semibold ${dark ? 'border-[#34343A] text-white' : 'border-gray-300 text-gray-700'}`} 
        >
          {t.whatsappOrder}
        </a>
      ) : null}
    </form>
  )
}
