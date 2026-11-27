// সেলার ড্যাশবোর্ড — আসল ডাটা থেকে পরিসংখ্যান (আজকের অর্ডার, নতুন
// অর্ডার, আজকের বিক্রি, সক্রিয় ল্যান্ডিং পেজ), সাম্প্রতিক অর্ডার,
// Sheet সংযোগের অবস্থা। কোনো বানানো সংখ্যা নেই — ডাটা না থাকলে ০।
import { useEffect, useState } from 'react'
import SellerShell, { STATUS_BN } from '../components/SellerShell.tsx'
import GoogleSheetsSettings from '../components/GoogleSheetsSettings.tsx'
import { useAuth } from '../lib/auth.tsx'
import {
  fetchDashboardStats,
  fetchSellerShop,
  type DashboardStats,
} from '../lib/products.ts'
import { formatBDT, formatCountBn } from '../lib/pricing.ts'
import { navigate } from '../lib/router.ts'
import {
  fetchSheetConnection,
  fetchSheetSyncSummary,
  type SheetConnection,
  type SheetSyncSummary,
} from '../lib/sheets.ts'
import type { ShopRow } from '../lib/types.ts'
import SetupWizard from './SetupWizard.tsx'

function formatDateTimeShort(iso: string): string {
  return new Date(iso).toLocaleString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ড্যাশবোর্ডের Google Sheet কার্ড — আসল সংযোগ ও সিঙ্কের অবস্থা।
function SheetStatusCard() {
  const { seller } = useAuth()
  const [connection, setConnection] = useState<SheetConnection | null>(null)
  const [summary, setSummary] = useState<SheetSyncSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seller) return
    Promise.all([
      fetchSheetConnection(seller.id),
      fetchSheetSyncSummary(seller.id),
    ])
      .then(([conn, sum]) => {
        setConnection(conn)
        setSummary(sum)
      })
      .catch(() => {
        // অবস্থা না জানা গেলে কার্ডটা চুপচাপ সত্য কথাই বলবে।
      })
      .finally(() => setLoading(false))
  }, [seller])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="font-bold">Google Sheet সংযোগ</h2>
      {loading ? (
        <p className="mt-2 text-sm text-gray-500">লোড হচ্ছে…</p>
      ) : !connection ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Google Sheet এখনো যুক্ত করা হয়নি — অর্ডার আপাতত শুধু এখানেই
            দেখা যাবে।
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/settings')}
            className="mt-3 text-sm font-semibold text-brand-dark underline"
          >
            Google Sheet যুক্ত করুন →
          </button>
        </>
      ) : !connection.sheet_id ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Google যুক্ত হয়েছে ({connection.google_email ?? '—'}) — Sheet
            এখনো বাছা হয়নি।
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/settings')}
            className="mt-3 text-sm font-semibold text-brand-dark underline"
          >
            Sheet বাছুন →
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-gray-600">
            সংযুক্ত: {connection.google_email ?? '—'}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            সিঙ্ক হয়েছে {formatCountBn(summary?.synced ?? 0)}টি
            {summary && summary.pending > 0
              ? ` · অপেক্ষায় ${formatCountBn(summary.pending)}টি`
              : ''}
            {summary && summary.failed > 0
              ? ` · ব্যর্থ ${formatCountBn(summary.failed)}টি`
              : ''}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            শেষ সিঙ্ক:{' '}
            {summary?.lastSyncedAt
              ? formatDateTimeShort(summary.lastSyncedAt)
              : 'এখনো হয়নি'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={connection.sheet_url ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-brand-dark underline"
            >
              শিট খুলুন ↗
            </a>
            <button
              type="button"
              onClick={() => navigate('/dashboard/settings')}
              className="text-sm font-semibold text-brand-dark underline"
            >
              সিঙ্কের অবস্থা দেখুন →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

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
              <SheetStatusCard />
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
  const { seller } = useAuth()
  const [shop, setShop] = useState<ShopRow | null>(null)
  const [shopLoaded, setShopLoaded] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)

  useEffect(() => {
    if (!seller) return
    fetchSellerShop(seller.id)
      .then((s) => setShop(s))
      .catch(() => {
        // দোকান না পাওয়া গেলে উইজার্ড খালি ফর্ম দেখাবে।
      })
      .finally(() => setShopLoaded(true))
  }, [seller])

  return (
    <SellerShell active="settings">
      <h1 className="text-2xl font-extrabold">সেটিংস</h1>
      {shopSaved ? (
        <p className="mt-4 rounded bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          দোকানের তথ্য সেভ হয়েছে ✓
        </p>
      ) : null}
      <div className="mt-6 space-y-6">
        {/* দোকানের তথ্য লোড হওয়ার পরেই উইজার্ড বসে — নইলে ভরা মান
            (slug, চার্জ) খালি থেকে যেত। */}
        {!shopLoaded ? (
          <p className="text-sm text-gray-500">লোড হচ্ছে…</p>
        ) : (
          <SetupWizard
            compact
            initial={{
              shopName: seller?.shop_name ?? '',
              ownerName: seller?.owner_name ?? '',
              whatsapp: (seller?.whatsapp ?? '').replace(/^880/, '0'),
              slug: shop?.slug ?? '',
              insideCharge: shop ? Number(shop.delivery_inside_charge) : 60,
              outsideCharge: shop ? Number(shop.delivery_outside_charge) : 120,
            }}
            onDone={() => setShopSaved(true)}
          />
        )}
        <GoogleSheetsSettings shopName={seller?.shop_name ?? null} />
      </div>
    </SellerShell>
  )
}
