// টেমপ্লেট ২-এর অর্ডার ফর্ম — নাম, মোবাইল, বিকল্প মোবাইল
// (ঐচ্ছিক), সম্পূর্ণ ঠিকানা, জেলা, এলাকা/থানা, সাইজ, রং,
// পরিমাণ, ডেলিভারি এলাকা (রেডিও কার্ড, চার্জসহ)। ভুল হলে
// প্রতিটা ফিল্ডের নিচে বাংলা এরর + ফিল্ডে লাল বর্ডার;
// কোনো অ্যালার্ট পপআপ নেই। জমা দেওয়ার সময় বোতামে
// "অপেক্ষা করুন..." আর ডাবল ক্লিক বন্ধ থাকে। সাইজ/রং/
// পরিমাণ/এলাকা TemplateTwo-এর স্টেট (সারাংশের হিসাবের জন্য
// লিফট করা)।
// জমা আসল: lib/orders.ts-এর placeOrder দিয়ে অর্ডার সেলারের
// ড্যাশবোর্ডে যায়, তারপর triggerOrderSync-এ Google Sheet-এ
// সিঙ্ক হয় (টেমপ্লেট ১-এর ফর্মের মতোই)। জেলা → orders.district,
// এলাকা/থানা → orders.upazila-তে জমা হয়; বিভাগের বক্স নেই
// বলে division খালি যায়। বিকল্প মোবাইলের কলাম মডেলে নেই —
// জমা হয় না। সাইজ/রংয়েরও কলাম নেই — জমা হয় না, নোটে
// লেখা হয় না (Stage 2-এর মডেল সিদ্ধান্ত এখনো বাকি)।
// সফল হলে ফর্ম লুকিয়ে "অর্ডার পাওয়া গেছে" + অর্ডার নম্বর
// দেখায় (কোড ফেরত এলেই, নইলে শুধু বার্তা)।
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { DIVISION_DISTRICTS, DIVISIONS } from '../../lib/orders.ts'
import { placeOrder } from '../../lib/orders.ts'
import { triggerOrderSync } from '../../lib/sheets.ts'
import {
  bdt,
  bn,
  effectiveDeliveryCharge,
  FOCUS_RING,
} from './helpers.ts'
import type { DeliveryArea, TemplateTwoProduct } from './types.ts'

const PHONE_RE = /^01[3-9][0-9]{8}$/

interface FieldErrors {
  name?: string
  phone?: string
  altPhone?: string
  address?: string
  district?: string
  thana?: string
  size?: string
  color?: string
}

const inputClass = (invalid: boolean) =>
  `w-full rounded-[4px] border-[1.5px] bg-white px-3.5 py-3 text-base text-[#181818] placeholder:text-[#A8A29A] min-h-[50px] ${FOCUS_RING} ${
    invalid ? 'border-[#B42318]' : 'border-[#EAE7E1]'
  }`

export default function TemplateTwoOrderForm({
  product,
  size,
  color,
  quantity,
  area,
  onSizeChange,
  onColorChange,
  onQuantityChange,
  onAreaChange,
}: {
  product: TemplateTwoProduct
  size: string
  color: string
  quantity: number
  area: DeliveryArea
  onSizeChange: (size: string) => void
  onColorChange: (color: string) => void
  onQuantityChange: (quantity: number) => void
  onAreaChange: (area: DeliveryArea) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [altPhone, setAltPhone] = useState('')
  const [address, setAddress] = useState('')
  const [district, setDistrict] = useState('')
  const [thana, setThana] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [orderCode, setOrderCode] = useState('')
  const [submitFailed, setSubmitFailed] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLTextAreaElement>(null)
  const districtRef = useRef<HTMLSelectElement>(null)
  const thanaRef = useRef<HTMLInputElement>(null)

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (name.trim().length < 2) next.name = 'আপনার নাম লিখুন'
    if (!PHONE_RE.test(phone.trim()))
      next.phone = '১১ ডিজিটের সঠিক মোবাইল নম্বর দিন'
    if (altPhone.trim() !== '' && !PHONE_RE.test(altPhone.trim()))
      next.altPhone = 'সঠিক মোবাইল নম্বর দিন, না হলে খালি রাখুন'
    if (address.trim().length < 10) next.address = 'সম্পূর্ণ ঠিকানা লিখুন'
    if (district.trim() === '') next.district = 'জেলা বেছে নিন'
    if (thana.trim().length < 2) next.thana = 'এলাকা / থানা লিখুন'
    if (product.sizes.length > 0 && size === '')
      next.size = 'সাইজ বেছে নিন'
    if (product.colors.length > 0 && color === '')
      next.color = 'রং বেছে নিন'
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
    if (nextErrors.district) {
      districtRef.current?.focus()
      return
    }
    if (nextErrors.thana) {
      thanaRef.current?.focus()
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
        district: district.trim(),
        upazila: thana.trim(),
        addressLine: address.trim(),
        deliveryArea: area,
        quantity,
        customerNote: '',
      })
      // Sheet সিঙ্ক — টেমপ্লেট ১-এর ফর্মের মতোই, id থাকলেই
      // ফায়ার-অ্যান্ড-ফরগেট; সিঙ্ক ব্যর্থ হলেও অর্ডার আটকায় না।
      if (placed.id) triggerOrderSync(placed.id)
      // কোডটা রেখে দিন — সফলতার পর্দায় কাস্টমারকে জানাতে হবে।
      if (placed.orderCode) setOrderCode(placed.orderCode)
      setPlaced(true)
    } catch {
      setSubmitFailed(true)
    } finally {
      setBusy(false)
    }
  }

  if (placed) {
    return (
      <div className="rounded-[4px] border border-[#EAE7E1] bg-white p-8 text-center text-[#181818]">
        <p className="m-0 font-serif text-2xl font-bold text-[#294C3C]">
          অর্ডার পাওয়া গেছে
        </p>
        <p className="m-0 mt-2 leading-relaxed">
          অর্ডার পাওয়া গেছে, শীঘ্রই আপনাকে ফোন করা হবে।
        </p>
        {orderCode ? (
          <p className="m-0 mt-2 font-bold">অর্ডার নম্বর: {orderCode}</p>
        ) : null}
        <p className="m-0 mt-3 text-sm text-[#77736F]">
          ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দেবেন।
        </p>
      </div>
    )
  }

  const selectedColor = product.colors.find((c) => c.name === color)

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="grid gap-4 rounded-[4px] border border-[#EAE7E1] bg-white p-5 text-[#181818] lg:p-7"
    >
      <div>
        <label
          htmlFor="t2-name"
          className="mb-[5px] block text-[15px] font-semibold"
        >
          আপনার নাম
        </label>
        <input
          ref={nameRef}
          id="t2-name"
          type="text"
          autoComplete="name"
          placeholder="যেমন: রাফিদ হাসান"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
          }}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 't2-name-err' : undefined}
          className={inputClass(Boolean(errors.name))}
        />
        {errors.name ? (
          <p id="t2-name-err" className="m-0 mt-1 text-sm text-[#B42318]">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="t2-phone"
            className="mb-[5px] block text-[15px] font-semibold"
          >
            মোবাইল নম্বর
          </label>
          <input
            ref={phoneRef}
            id="t2-phone"
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
            aria-describedby={errors.phone ? 't2-phone-err' : undefined}
            className={inputClass(Boolean(errors.phone))}
          />
          {errors.phone ? (
            <p id="t2-phone-err" className="m-0 mt-1 text-sm text-[#B42318]">
              {errors.phone}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="t2-alt-phone"
            className="mb-[5px] block text-[15px] font-semibold"
          >
            বিকল্প মোবাইল নম্বর{' '}
            <span className="font-normal text-[#77736F]">(ঐচ্ছিক)</span>
          </label>
          <input
            id="t2-alt-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            value={altPhone}
            onChange={(e) => {
              setAltPhone(e.target.value)
              if (errors.altPhone)
                setErrors((prev) => ({ ...prev, altPhone: undefined }))
            }}
            aria-invalid={Boolean(errors.altPhone)}
            aria-describedby={errors.altPhone ? 't2-alt-phone-err' : undefined}
            className={inputClass(Boolean(errors.altPhone))}
          />
          {errors.altPhone ? (
            <p
              id="t2-alt-phone-err"
              className="m-0 mt-1 text-sm text-[#B42318]"
            >
              {errors.altPhone}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label
          htmlFor="t2-address"
          className="mb-[5px] block text-[15px] font-semibold"
        >
          সম্পূর্ণ ঠিকানা
        </label>
        <textarea
          ref={addressRef}
          id="t2-address"
          autoComplete="street-address"
          placeholder="বাড়ি নং, রোড, এলাকা"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value)
            if (errors.address)
              setErrors((prev) => ({ ...prev, address: undefined }))
          }}
          aria-invalid={Boolean(errors.address)}
          aria-describedby={errors.address ? 't2-address-err' : undefined}
          className={`${inputClass(Boolean(errors.address))} min-h-[84px] resize-y`}
        />
        {errors.address ? (
          <p id="t2-address-err" className="m-0 mt-1 text-sm text-[#B42318]">
            {errors.address}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="t2-district"
            className="mb-[5px] block text-[15px] font-semibold"
          >
            জেলা
          </label>
          <select
            ref={districtRef}
            id="t2-district"
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value)
              if (errors.district)
                setErrors((prev) => ({ ...prev, district: undefined }))
            }}
            aria-invalid={Boolean(errors.district)}
            aria-describedby={errors.district ? 't2-district-err' : undefined}
            className={inputClass(Boolean(errors.district))}
          >
            <option value="">জেলা বেছে নিন</option>
            {DIVISIONS.map((division) => (
              <optgroup key={division} label={division}>
                {(DIVISION_DISTRICTS[division] ?? []).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.district ? (
            <p
              id="t2-district-err"
              className="m-0 mt-1 text-sm text-[#B42318]"
            >
              {errors.district}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="t2-thana"
            className="mb-[5px] block text-[15px] font-semibold"
          >
            এলাকা / থানা
          </label>
          <input
            ref={thanaRef}
            id="t2-thana"
            type="text"
            autoComplete="address-level2"
            placeholder="যেমন: ধানমন্ডি"
            value={thana}
            onChange={(e) => {
              setThana(e.target.value)
              if (errors.thana)
                setErrors((prev) => ({ ...prev, thana: undefined }))
            }}
            aria-invalid={Boolean(errors.thana)}
            aria-describedby={errors.thana ? 't2-thana-err' : undefined}
            className={inputClass(Boolean(errors.thana))}
          />
          {errors.thana ? (
            <p id="t2-thana-err" className="m-0 mt-1 text-sm text-[#B42318]">
              {errors.thana}
            </p>
          ) : null}
        </div>
      </div>

      {product.sizes.length > 0 ? (
        <div>
          <span className="mb-[5px] block text-[15px] font-semibold">
            সাইজ
          </span>
          <div
            className="flex flex-wrap gap-2.5"
            role="radiogroup"
            aria-label="সাইজ বেছে নিন"
          >
            {product.sizes.map((s) => {
              const checked = size === s
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => {
                    onSizeChange(s)
                    if (errors.size)
                      setErrors((prev) => ({ ...prev, size: undefined }))
                  }}
                  className={`min-h-[48px] min-w-[52px] rounded-[4px] border-[1.5px] px-3.5 py-2 text-[15px] font-semibold ${
                    checked
                      ? 'border-[#294C3C] bg-[#294C3C] text-white'
                      : 'border-[#EAE7E1] bg-white text-[#181818] hover:border-[#294C3C]'
                  } ${FOCUS_RING}`}
                >
                  {s}
                </button>
              )
            })}
          </div>
          {errors.size ? (
            <p className="m-0 mt-1 text-sm text-[#B42318]">{errors.size}</p>
          ) : null}
        </div>
      ) : null}

      {product.colors.length > 0 ? (
        <div>
          <span className="mb-[5px] block text-[15px] font-semibold">
            রং:{' '}
            <span className="font-normal text-[#77736F]">
              {selectedColor ? selectedColor.name : 'বেছে নিন'}
            </span>
          </span>
          <div
            className="flex flex-wrap gap-2.5"
            role="radiogroup"
            aria-label="রং বেছে নিন"
          >
            {product.colors.map((c) => {
              const checked = color === c.name
              return (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={`রং ${c.name}`}
                  onClick={() => {
                    onColorChange(c.name)
                    if (errors.color)
                      setErrors((prev) => ({ ...prev, color: undefined }))
                  }}
                  title={c.name}
                  className={`h-11 w-11 rounded-full border-2 p-[3px] ${
                    checked
                      ? 'border-[#294C3C]'
                      : 'border-[#EAE7E1] hover:border-[#B9B2A6]'
                  } ${FOCUS_RING}`}
                >
                  <span
                    aria-hidden="true"
                    className="block h-full w-full rounded-full border border-black/10"
                    style={{ backgroundColor: c.hex }}
                  />
                </button>
              )
            })}
          </div>
          {errors.color ? (
            <p className="m-0 mt-1 text-sm text-[#B42318]">{errors.color}</p>
          ) : null}
        </div>
      ) : null}

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
                className={`m-0 flex min-h-[48px] cursor-pointer items-center gap-2 rounded-[4px] border-[1.5px] px-3 py-2.5 font-medium ${
                  checked
                    ? 'border-[#294C3C] bg-[#E9EEE9]'
                    : 'border-[#EAE7E1]'
                } ${FOCUS_RING}`}
              >
                <input
                  type="radio"
                  name="t2-area"
                  value={option.value}
                  checked={checked}
                  onChange={() => onAreaChange(option.value)}
                  className="h-[18px] w-[18px] shrink-0 accent-[#294C3C]"
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
        <span className="flex items-center rounded-[4px] border-[1.5px] border-[#EAE7E1] bg-white">
          <button
            type="button"
            aria-label="কমান"
            disabled={quantity <= 1}
            onClick={() => onQuantityChange(quantity - 1)}
            className={`h-12 w-12 text-2xl leading-none text-[#294C3C] disabled:opacity-40 ${FOCUS_RING}`}
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
            className={`h-12 w-12 text-2xl leading-none text-[#294C3C] disabled:opacity-40 ${FOCUS_RING}`}
          >
            +
          </button>
        </span>
      </div>

      <button
        type="submit"
        disabled={busy}
        className={`block min-h-[56px] w-full rounded-[4px] bg-[#294C3C] px-4 py-[15px] text-xl font-bold text-white hover:bg-[#1F3D2F] disabled:opacity-60 ${FOCUS_RING}`}
      >
        {busy ? 'অপেক্ষা করুন...' : 'অর্ডার কনফার্ম করুন'}
      </button>
      {submitFailed ? (
        <p className="m-0 text-center text-sm text-[#B42318]">
          অর্ডার দেওয়া যায়নি — আবার চেষ্টা করুন।
        </p>
      ) : null}
      <p className="m-0 text-center text-sm text-[#77736F]">
        ক্যাশ অন ডেলিভারি। অগ্রিম কোনো টাকা লাগবে না।
      </p>
    </form>
  )
}
