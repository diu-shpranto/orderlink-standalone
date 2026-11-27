// সেলার ড্যাশবোর্ড — আসল ডাটা থেকে পরিসংখ্যান (আজকের অর্ডার, নতুন
// অর্ডার, আজকের বিক্রি, সক্রিয় ল্যান্ডিং পেজ), সাম্প্রতিক অর্ডার,
// Sheet সংযোগের অবস্থা। কোনো বানানো সংখ্যা নেই — ডাটা না থাকলে ০।
import { useEffect, useState } from 'react'
import SellerShell, { STATUS_BN } from '../components/SellerShell.tsx'
import { useAuth } from '../lib/auth.tsx'
import {
  fetchDashboardStats,
  type DashboardStats,
} from '../lib/products.ts'
import { formatBDT, formatCountBn } from '../lib/pricing.ts'
import { navigate } from '../lib/router.ts'
import SetupWizard from './SetupWizard.tsx'

type SalesRange = 'today' | '7d' | '30d'

const RANGE_LABEL: Record<SalesRange, string> = {
  today: 'আজ',
  '7d': '৭ দিন',
  '30d': '৩০ দিন',
}

export function DashboardOverview() {
  const { seller } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [range, setRange] = useState<SalesRange>('today')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!seller) return
    setLoading(true)
    fetchDashboardStats(seller.id)
      .then((s) => setStats(s))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'লোড করা যায়নি।')
      })
      .finally(() => setLoading(false))
  }, [seller])

  const salesForRange =
    range === 'today'
      ? (stats?.todaySales ?? 0)
      : range === '7d'
        ? (stats?.salesLast7Days ?? 0)
        : (stats?.salesLast30Days ?? 0)

  const statCards = [
    { label: 'আজকের অর্ডার', value: formatCountBn(stats?.todayOrders ?? 0) },
    { label: 'নতুন অর্ডার', value: formatCountBn(stats?.newOrders ?? 0) },
    { label: 'আজকের বিক্রি', value: formatBDT(stats?.todaySales ?? 0) },
    {
      label: 'সক্রিয় ল্যান্ডিং পেজ',
      value: formatCountBn(stats?.activePages ?? 0),
    },
  ]

  return (
    <SellerShell active="dashboard">
      <h1 className="text-2xl font-extrabold">
        স্বাগতম{seller?.shop_name ? `, ${seller.shop_name}` : ''}!
      </h1>
      {loading ? (
        <p className="mt-6 text-gray-600">লোড হচ্ছে…</p>
      ) : error ? (
        <p className="mt-6 rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-1 text-2xl font-extrabold">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold">বিক্রির হিসাব</h2>
              <div className="flex gap-2">
                {(Object.keys(RANGE_LABEL) as SalesRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      range === r
                        ? 'bg-brand text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {RANGE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-4 text-3xl font-extrabold">
              {formatBDT(salesForRange)}
            </p>
            <p className="text-sm text-gray-500">
              {RANGE_LABEL[range]}-এর মোট বিক্রি (বাতিল অর্ডার ছাড়া)
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-bold">সাম্প্রতিক অর্ডার</h2>
              {!stats || stats.recentOrders.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  এখনো কোনো অর্ডার আসেনি।
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {stats.recentOrders.map((o) => (
                    <li key={o.id} className="flex justify-between gap-3 py-2 text-sm">
                      <span>
                        <span className="font-semibold">{o.order_code}</span>
                        <span className="block text-gray-500">
                          {o.customer_name} · {STATUS_BN[o.status] ?? o.status}
                        </span>
                      </span>
                      <span className="font-bold">{formatBDT(o.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => navigate('/dashboard/orders')}
                className="mt-4 text-sm font-semibold text-brand-dark underline"
              >
                সব অর্ডার দেখুন →
              </button>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="font-bold">Google Sheet সংযোগ</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  Google Sheet সংযোগ শীঘ্রই আসছে — অর্ডার আপাতত এখানেই দেখা
                  যাবে।
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="font-bold">দ্রুত কাজ</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/products/new')}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
                  >
                    নতুন প্রোডাক্ট যোগ করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/settings')}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold"
                  >
                    দোকানের তথ্য বদলান
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </SellerShell>
  )
}

export function SettingsPage() {
  return <SetupWizard onDone={() => navigate('/dashboard')} />
}
