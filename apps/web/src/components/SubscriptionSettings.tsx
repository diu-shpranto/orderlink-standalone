// Settings → সাবস্ক্রিপশন — আসল প্ল্যান, ব্যবহার, প্যাকেজ কেনা
// (TrxID পেমেন্ট + অ্যাডমিন অনুমোদন) আর পেমেন্টের ইতিহাস।
// দাম ও সীমা সার্ভারের ক্যাটালগ থেকে; ফ্রি প্ল্যানে সীমার সংখ্যা
// দেখানো হয় না — শুধু ব্যবহার দেখানো হয়।
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { formatBDT, formatCountBn, toBnDigits } from '../lib/pricing.ts'
import { fetchSellerProducts, type ProductListItem } from '../lib/products.ts'
import {
  METHOD_BN,
  METHOD_SETTING_KEY,
  PAYMENT_METHODS,
  chooseKeptPage,
  fetchMyPayments,
  fetchMySubscription,
  fetchPlans,
  fetchPlatformSettings,
  fetchUsage,
  storageMbLabel,
  submitSubscriptionPayment,
  type MySubscription,
  type PaymentMethod,
  type PaymentRow,
  type PlanRow,
  type UsageRow,
} from '../lib/subscription.ts'

function formatDateBn(iso: string): string {
  return new Date(iso).toLocaleDateString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTimeBn(iso: string): string {
  return new Date(iso).toLocaleString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  const text = mb >= 100 ? String(Math.round(mb)) : mb.toFixed(1)
  return `${toBnDigits(text)} MB`
}

const PAYMENT_STATUS_BN: Record<PaymentRow['status'], string> = {
  pending: 'যাচাইয়ের অপেক্ষায়',
  approved: 'অনুমোদিত',
  rejected: 'বাতিল',
}

const PAYMENT_STATUS_CLASS: Record<PaymentRow['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-brand-light text-brand-dark',
  rejected: 'bg-red-100 text-red-700',
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20'

export default function SubscriptionSettings() {
  const { seller } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mySub, setMySub] = useState<MySubscription | null>(null)
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [paymentNumbers, setPaymentNumbers] = useState<Record<string, string>>({})
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [usage, setUsage] = useState<UsageRow | null>(null)
  const [suspended, setSuspended] = useState<ProductListItem[]>([])
  const [notice, setNotice] = useState('')

  // আপগ্রেডের ধাপ: প্যাকেজ বাছা → মাধ্যম + TrxID → জমা।
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('bkash')
  const [trxid, setTrxid] = useState('')
  const [senderNumber, setSenderNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitDone, setSubmitDone] = useState(false)
  const [keepBusyId, setKeepBusyId] = useState('')

  async function load() {
    if (!seller) return
    setLoading(true)
    setError('')
    try {
      const [sub, planList, settings, payList, use, products] =
        await Promise.all([
          fetchMySubscription(seller.id),
          fetchPlans(),
          fetchPlatformSettings(),
          fetchMyPayments(seller.id),
          fetchUsage(seller.id),
          fetchSellerProducts(seller.id),
        ])
      setMySub(sub)
      setPlans(planList)
      setPaymentNumbers(settings)
      setPayments(payList)
      setUsage(use)
      setSuspended(products.filter((p) => p.page?.is_suspended))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লোড করা যায়নি।')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller])

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null
  const configuredMethods = PAYMENT_METHODS.filter(
    (m) => (paymentNumbers[METHOD_SETTING_KEY[m]] ?? '').trim() !== '',
  )
  const paymentsOpen = configuredMethods.length > 0
  const selectedNumber = (
    paymentNumbers[METHOD_SETTING_KEY[selectedMethod]] ?? ''
  ).trim()

  async function handleSubmitPayment(event: React.FormEvent) {
    event.preventDefault()
    setSubmitError('')
    setSubmitDone(false)
    if (!selectedPlan) {
      setSubmitError('প্যাকেজ বেছে নিন।')
      return
    }
    if (!trxid.trim()) {
      setSubmitError('TrxID দিন।')
      return
    }
    if (!senderNumber.trim()) {
      setSubmitError('যে নম্বর থেকে টাকা পাঠিয়েছেন সেটা দিন।')
      return
    }
    setSubmitting(true)
    try {
      await submitSubscriptionPayment({
        planId: selectedPlan.id,
        method: selectedMethod,
        trxid: trxid.trim(),
        senderNumber: senderNumber.trim(),
      })
      setSubmitDone(true)
      setTrxid('')
      setSenderNumber('')
      await load()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'পেমেন্ট জমা করা যায়নি।',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleKeepPage(item: ProductListItem) {
    if (!item.page) return
    setKeepBusyId(item.product.id)
    setNotice('')
    setError('')
    try {
      await chooseKeptPage(item.page.id)
      setNotice(`"${item.product.name}" পেজটি চালু রাখা হয়েছে।`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'বদলানো যায়নি।')
    } finally {
      setKeepBusyId('')
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">লোড হচ্ছে…</p>
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-2xl bg-brand-light px-4 py-3 text-sm font-bold text-brand-dark">
          {notice}
        </p>
      ) : null}

      {/* বর্তমান প্যাকেজ */}
      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-6">
        <h2 className="text-lg font-extrabold">বর্তমান প্যাকেজ</h2>
        {mySub?.plan ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-brand-light px-4 py-2 text-base font-extrabold text-brand-dark">
                {mySub.plan.name} প্ল্যান
              </span>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  mySub.state === 'active'
                    ? 'bg-brand-light text-brand-dark'
                    : mySub.state === 'expiring'
                      ? 'bg-amber-100 text-amber-800'
                      : mySub.state === 'grace'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-700'
                }`}
              >
                {mySub.state === 'active'
                  ? 'সক্রিয়'
                  : mySub.state === 'expiring'
                    ? `মেয়াদ শেষ হতে ${toBnDigits(mySub.daysLeft)} দিন বাকি`
                    : mySub.state === 'grace'
                      ? `গ্রেস চলছে — ${toBnDigits(mySub.daysLeft)} দিন বাকি`
                      : 'মেয়াদ শেষ'}
              </span>
            </div>
            <dl className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm">
                <dt className="text-gray-500">মেয়াদ শেষ</dt>
                <dd className="font-bold text-gray-900">
                  {mySub.subscription
                    ? formatDateBn(mySub.subscription.ends_at)
                    : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm">
                <dt className="text-gray-500">সক্রিয় পেজ</dt>
                <dd className="font-bold text-gray-900">
                  {formatCountBn(usage?.active_pages ?? 0)}টি /{' '}
                  {toBnDigits(mySub.plan.max_pages)}টি
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm">
                <dt className="text-gray-500">ছবির স্টোরেজ</dt>
                <dd className="font-bold text-gray-900">
                  {formatMb(usage?.storage_bytes ?? 0)} /{' '}
                  {storageMbLabel(mySub.plan.storage_mb)}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <div className="mt-4">
              <span className="rounded-full bg-gray-100 px-4 py-2 text-base font-extrabold text-gray-700">
                ফ্রি প্ল্যান
              </span>
            </div>
            <dl className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm">
                <dt className="text-gray-500">সক্রিয় পেজ</dt>
                <dd className="font-bold text-gray-900">
                  {formatCountBn(usage?.active_pages ?? 0)}টি
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm">
                <dt className="text-gray-500">ছবির স্টোরেজ ব্যবহৃত</dt>
                <dd className="font-bold text-gray-900">
                  {formatMb(usage?.storage_bytes ?? 0)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              ফ্রি প্ল্যানে সর্বোচ্চ ১টি পেজ সক্রিয় থাকে। নিচ থেকে প্যাকেজ
              কিনলে ৩০ দিনের পুরো অ্যাক্সেস পাবেন — অনুমোদনের দিন থেকে মেয়াদ
              শুরু হবে।
            </p>
          </>
        )}
      </div>

      {/* সাসপেন্ডেড পেজ — ফ্রি সার্ভিসে কোনটা চালু থাকবে */}
      {suspended.length > 0 ? (
        <div className="rounded-[28px] border border-amber-300 bg-amber-50 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-6">
          <h2 className="text-lg font-extrabold">সাসপেন্ডেড পেজ</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            ফ্রি সার্ভিসে শুধু ১টি পেজ চালু থাকে — বাকিগুলো বন্ধ আছে, মোছা
            হয়নি। নিচের যেকোনো একটা চালু রাখতে পারেন, বা প্যাকেজ নবায়ন
            করলে সবগুলো আবার চালু হবে।
          </p>
          <ul className="mt-4 space-y-2">
            {suspended.map((item) => (
              <li
                key={item.product.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold">
                    {item.product.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatBDT(item.product.price)}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={keepBusyId === item.product.id}
                  onClick={() => void handleKeepPage(item)}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-brand-dark to-brand px-3.5 py-2 text-sm font-bold text-white shadow disabled:opacity-50"
                >
                  {keepBusyId === item.product.id
                    ? 'চালু হচ্ছে…'
                    : 'এই পেজটি চালু রাখুন'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* প্যাকেজ কেনা / নবায়ন */}
      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-6">
        <h2 className="text-lg font-extrabold">
          {mySub?.plan ? 'প্যাকেজ নবায়ন করুন' : 'প্যাকেজ কিনুন'}
        </h2>
        {!paymentsOpen ? (
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            পেমেন্ট এখনো চালু হয়নি — অ্যাডমিন পেমেন্টের নম্বর বসালে এখান
            থেকে প্যাকেজ কিনতে পারবেন।
          </p>
        ) : plans.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">
            প্যাকেজের তালিকা পাওয়া যায়নি — আবার চেষ্টা করুন।
          </p>
        ) : (
          <form onSubmit={handleSubmitPayment}>
            <p className="mt-3 text-sm font-bold text-gray-800">
              প্যাকেজ বেছে নিন
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {plans.map((pkg) => {
                const isActive = selectedPlanId === pkg.id
                const isCurrent = mySub?.plan?.id === pkg.id
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPlanId(pkg.id)}
                    className={`relative rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? 'border-brand bg-brand-light shadow-sm'
                        : 'border-gray-200 bg-white hover:border-brand/40'
                    }`}
                  >
                    {pkg.is_recommended ? (
                      <span className="absolute -top-2.5 right-3 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold text-white">
                        সবচেয়ে জনপ্রিয়
                      </span>
                    ) : null}
                    <span className="block font-extrabold">
                      {pkg.name}
                      {isCurrent ? (
                        <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-brand-dark">
                          বর্তমান
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xl font-extrabold text-brand-dark">
                      {formatBDT(pkg.price_bdt)}
                      <span className="text-sm font-bold text-gray-500">
                        {' '}
                        / মাস
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-gray-600">
                      {toBnDigits(pkg.max_pages)}টি পেজ ·{' '}
                      {storageMbLabel(pkg.storage_mb)} স্টোরেজ
                    </span>
                  </button>
                )
              })}
            </div>

            {selectedPlan ? (
              <>
                <p className="mt-5 text-sm font-bold text-gray-800">
                  পেমেন্টের মাধ্যম
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {configuredMethods.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMethod(m)}
                      className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${
                        selectedMethod === m
                          ? 'bg-gradient-to-r from-brand-dark to-brand text-white shadow'
                          : 'border border-gray-200 bg-white text-gray-600 shadow-sm'
                      }`}
                    >
                      {METHOD_BN[m]}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-cream px-4 py-4 text-sm leading-relaxed">
                  <p>
                    <span className="font-bold">{METHOD_BN[selectedMethod]} (Send Money)</span>{' '}
                    নম্বরে{' '}
                    <span className="font-extrabold text-brand-dark">
                      {formatBDT(selectedPlan.price_bdt)}
                    </span>{' '}
                    পাঠান:
                  </p>
                  <p className="mt-2 text-center text-2xl font-extrabold tracking-wider text-gray-900">
                    {selectedNumber}
                  </p>
                  <p className="mt-2 text-gray-600">
                    টাকা পাঠানোর পর নিচে TrxID আর যে নম্বর থেকে পাঠিয়েছেন
                    সেটা দিন। অ্যাডমিন যাচাই করে অনুমোদন দিলে অনুমোদনের দিন
                    থেকে ৩০ দিনের মেয়াদ শুরু হবে।
                  </p>
                </div>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm font-bold text-gray-800">
                      TrxID
                    </span>
                    <input
                      type="text"
                      required
                      value={trxid}
                      onChange={(e) => setTrxid(e.target.value)}
                      placeholder="যেমন: 9HX7K2M4PQ"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-gray-800">
                      পাঠানো নম্বর
                    </span>
                    <input
                      type="tel"
                      required
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      placeholder="যেমন: 01XXXXXXXXX"
                      className={inputClass}
                    />
                  </label>
                </div>
                {submitDone ? (
                  <p className="mt-4 rounded-2xl bg-brand-light px-4 py-3 text-sm font-bold text-brand-dark">
                    পেমেন্ট জমা হয়েছে ✓ — অ্যাডমিন যাচাই করে অনুমোদন দিলে
                    মেয়াদ শুরু হবে।
                  </p>
                ) : null}
                {submitError ? (
                  <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {submitError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-4 w-full rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-4 py-3.5 font-bold text-white shadow-lg shadow-brand/25 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
                >
                  {submitting ? 'জমা হচ্ছে…' : 'পেমেন্ট জমা দিন'}
                </button>
              </>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                উপরে প্যাকেজ বাছলে পেমেন্টের নির্দেশনা দেখাবে।
              </p>
            )}
          </form>
        )}
      </div>

      {/* পেমেন্টের ইতিহাস */}
      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-6">
        <h2 className="text-lg font-extrabold">পেমেন্টের ইতিহাস</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            এখনো কোনো পেমেন্ট জমা দেওয়া হয়নি।
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {payments.map((pay) => {
              const planName =
                plans.find((p) => p.id === pay.plan_id)?.name ?? pay.plan_id
              return (
                <li
                  key={pay.id}
                  className="rounded-2xl border border-gray-200 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold">
                      {planName} · {formatBDT(pay.amount_bdt)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${PAYMENT_STATUS_CLASS[pay.status]}`}
                    >
                      {PAYMENT_STATUS_BN[pay.status]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-600">
                    {METHOD_BN[pay.method]} · TrxID {pay.trxid} ·{' '}
                    {formatDateTimeBn(pay.created_at)}
                  </p>
                  {pay.receipt_code ? (
                    <p className="mt-1 text-sm text-gray-600">
                      রসিদ: <span className="font-bold">{pay.receipt_code}</span>
                    </p>
                  ) : null}
                  {pay.status === 'rejected' && pay.reject_reason ? (
                    <p className="mt-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                      বাতিলের কারণ: {pay.reject_reason}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
