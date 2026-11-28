// টেমপ্লেট ১-এর অর্ডার ফর্ম — নাম, মোবাইল, ঠিকানা, ডেলিভারি
// এলাকা (রেডিও কার্ড, চার্জসহ), পরিমাণ স্টেপার। ভুল হলে
// প্রতিটা ফিল্ডের নিচে বাংলা এরর + ফিল্ডে লাল বর্ডার;
// কোনো অ্যালার্ট পপআপ নেই। জমা দেওয়ার সময় বোতামে
// "অপেক্ষা করুন..." আর ডাবল ক্লিক বন্ধ থাকে। সফল হলে ফর্ম
// লুকিয়ে "অর্ডার পাওয়া গেছে" দেখায়। পরিমাণ ও এলাকা
// TemplateOne-এর স্টেট (সারাংশের হিসাবের জন্য লিফট করা)।
// জমা আসল: lib/orders.ts-এর placeOrder দিয়ে অর্ডার সেলারের
// ড্যাশবোর্ডে যায়, তারপর triggerOrderSync-এ Google Sheet-এ
// সিঙ্ক হয় (আগের শেয়ার করা ফর্মের মতোই)। এই ফর্মে বিভাগ/
// জেলার আলাদা বক্স নেই — ঠিকানা এক বক্সেই লেখা হয়, তাই
// division/district/upazila খালি যায়; নোটের বক্সও নেই।
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { placeOrder } from '../../lib/orders.ts'
import { triggerOrderSync } from '../../lib/sheets.ts'
import { bdt, bn, effectiveDeliveryCharge, FOCUS_RING } from './helpers.ts'
import type { DeliveryArea, TemplateOneProduct } from './types.ts'

const PHONE_RE = /^01[3-9][0-9]{8}$/

interface FieldErrors {
  name?: string
  phone?: string
  address?: string
}

const inputClass = (invalid: boolean) =>
  `w-full rounded-xl border-[1.5px] bg-white px-3.5 py-3 text-base text-[#14211A] placeholder:text-[#8A9A90] min-h-[50px] ${FOCUS_RING} ${
    invalid ? 'border-[#D7263D]' : 'border-[#DCE5DF]'
  }`

export default function TemplateOneOrderForm({
  product,
  quantity,
  area,
  onQuantityChange,
  onAreaChange,
}: {
  product: TemplateOneProduct
  quantity: number
  area: DeliveryArea
  onQuantityChange: (quantity: number) => void
  onAreaChange: (area: DeliveryArea) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [submitFailed, setSubmitFailed] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLTextAreaElement>(null)

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (name.trim().length < 2) next.name = 'আপনার নাম লিখুন'
    if (!PHONE_RE.test(phone.trim()))
      next.phone = '১১ ডিজিটের সঠিক মোবাইল নম্বর দিন'
    if (address.trim().length < 10) next.address = 'সম্পূর্ণ ঠিকানা লিখুন'
    return next
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const nextErrors = validate()
    setErrors(nextErrors)
    if (nextErrors.name) {
      nameRef.current?.focus()
      return
    }
    if (nextErrors.phone) {
      phoneRef.current?.focus()
      return
    }
    if (nextErrors.address) {
      addressRef.current?.focus()
      return
    }
    setSubmitFailed(false)
    setBusy(true)
    try {
      // আসল জমা — orderContext না থাকলে (শুধু নমুনা প্রিভিউ)
      // অর্ডার তৈরি হয় না, শুধু ব্যর্থতার লেখা দেখায়।
      const orderContext = product.orderContext
      if (!orderContext) throw new Error('অর্ডার জমা দেওয়া যায়নি।')
      const placed = await placeOrder({
        shop: orderContext.shop,
        product: orderContext.product,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        division: '',
        district: '',
        upazila: '',
        addressLine: address.trim(),
        deliveryArea: area,
        quantity,
        customerNote: '',
      })
      // Sheet সিঙ্ক — আগের শেয়ার করা ফর্মের মতোই, id থাকলেই
      // ফায়ার-অ্যান্ড-ফরগেট; সিঙ্ক ব্যর্থ হলেও অর্ডার আটকায় না।
      if (placed.id) triggerOrderSync(placed.id)
      setPlaced(true)
    } catch {
      setSubmitFailed(true)
    } finally {
      setBusy(false)
    }
  }

  if (placed) {
    return (
      <div className="rounded-[20px] bg-white p-[30px_10px] text-center text-[#14211A]">
        <p className="text-2xl font-bold text-[#0B5D3B]">অর্ডার পাওয়া গেছে</p>
        <p className="m-0 mt-2">
          অর্ডার পাওয়া গেছে, শীঘ্রই আপনাকে ফোন করা হবে।
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="grid gap-4 rounded-[20px] bg-white p-[18px] text-[#14211A] min-[861px]:p-[26px]"
    >
      <div>
        <label
          htmlFor="t1-name"
          className="mb-[5px] block text-[15px] font-semibold"
        >
          আপনার নাম
        </label>
        <input
          ref={nameRef}
          id="t1-name"
          type="text"
          autoComplete="name"
          placeholder="যেমন: রাফিদ হাসান"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
          }}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 't1-name-err' : undefined}
          className={inputClass(Boolean(errors.name))}
        />
        {errors.name ? (
          <p id="t1-name-err" className="m-0 mt-1 text-sm text-[#D7263D]">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="t1-phone"
          className="mb-[5px] block text-[15px] font-semibold"
        >
          মোবাইল নম্বর
        </label>
        <input
          ref={phoneRef}
          id="t1-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            if (errors.phone)
              setErrors((prev) => ({ ...prev, phone: undefined }))
          }}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 't1-phone-err' : undefined}
          className={inputClass(Boolean(errors.phone))}
        />
        {errors.phone ? (
          <p id="t1-phone-err" className="m-0 mt-1 text-sm text-[#D7263D]">
            {errors.phone}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="t1-address"
          className="mb-[5px] block text-[15px] font-semibold"
        >
          সম্পূর্ণ ঠিকানা
        </label>
        <textarea
          ref={addressRef}
          id="t1-address"
          autoComplete="street-address"
          placeholder="বাড়ি নং, রোড, থানা, জেলা"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value)
            if (errors.address)
              setErrors((prev) => ({ ...prev, address: undefined }))
          }}
          aria-invalid={Boolean(errors.address)}
          aria-describedby={errors.address ? 't1-address-err' : undefined}
          className={`${inputClass(Boolean(errors.address))} min-h-[84px] resize-y`}
        />
        {errors.address ? (
          <p id="t1-address-err" className="m-0 mt-1 text-sm text-[#D7263D]">
            {errors.address}
          </p>
        ) : null}
      </div>

      <div>
        <span className="mb-[5px] block text-[15px] font-semibold">
          ডেলিভারি এলাকা
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              { value: 'inside', label: 'ঢাকার ভিতরে' },
              { value: 'outside', label: 'ঢাকার বাইরে' },
            ] as const
          ).map((option) => {
            // প্রতিটা এলাকার চার্জও একই নিয়মে (ফ্রি-ডেলিভারি সীমাসহ)
            // — লেবেলের চার্জ আর মোটের চার্জ কখনো আলাদা হয় না।
            const charge = effectiveDeliveryCharge(
              product.deliveryCharges.inside,
              product.deliveryCharges.outside,
              product.freeDeliveryThreshold,
              product.price * quantity,
              option.value,
            )
            const checked = area === option.value
            return (
              <label
                key={option.value}
                className={`m-0 flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 font-medium ${
                  checked
                    ? 'border-[#0B5D3B] bg-[#E8F3EC]'
                    : 'border-[#DCE5DF]'
                } ${FOCUS_RING}`}
              >
                <input
                  type="radio"
                  name="t1-area"
                  value={option.value}
                  checked={checked}
                  onChange={() => onAreaChange(option.value)}
                  className="h-[18px] w-[18px] shrink-0 accent-[#0B5D3B]"
                />
                <span>
                  {option.label}{' '}
                  {charge > 0 ? bdt(charge) : 'ফ্রি ডেলিভারি'}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">পরিমাণ</span>
        <span className="flex items-center rounded-xl border-[1.5px] border-[#DCE5DF]">
          <button
            type="button"
            aria-label="কমান"
            disabled={quantity <= 1}
            onClick={() => onQuantityChange(quantity - 1)}
            className={`h-12 w-12 text-2xl leading-none text-[#0B5D3B] disabled:opacity-40 ${FOCUS_RING}`}
          >
            −
          </button>
          <span
            aria-live="polite"
            className="min-w-[34px] text-center font-bold"
          >
            {bn(quantity)}
          </span>
          <button
            type="button"
            aria-label="বাড়ান"
            disabled={quantity >= 10}
            onClick={() => onQuantityChange(quantity + 1)}
            className={`h-12 w-12 text-2xl leading-none text-[#0B5D3B] disabled:opacity-40 ${FOCUS_RING}`}
          >
            +
          </button>
        </span>
      </div>

      <button
        type="submit"
        disabled={busy}
        className={`block min-h-[56px] w-full rounded-[14px] bg-[#D7263D] px-4 py-[15px] text-xl font-bold text-white hover:bg-[#B91D31] disabled:opacity-60 ${FOCUS_RING}`}
      >
        {busy ? 'অপেক্ষা করুন...' : 'অর্ডার কনফার্ম করুন'}
      </button>
      {submitFailed ? (
        <p className="m-0 text-center text-sm text-[#D7263D]">
          অর্ডার দেওয়া যায়নি — আবার চেষ্টা করুন।
        </p>
      ) : null}
      <p className="m-0 text-center text-sm text-[#5B6B62]">
        ক্যাশ অন ডেলিভারি। অগ্রিম কোনো টাকা লাগবে না।
      </p>
    </form>
  )
}
