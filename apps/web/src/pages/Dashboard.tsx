// সেলার ড্যাশবোর্ড — লাইভ অ্যাপের ডিজাইন অনুযায়ী:
// স্বাগতম + বাংলা তারিখ + প্ল্যান চিপ, আইকন চিপসহ ৪টি স্ট্যাট কার্ড,
// বিক্রি ওভারভিউ (আজ/৭ দিন/৩০ দিন + দৈনিক বার চার্ট), আমার ল্যান্ডিং পেজ,
// সাম্প্রতিক অর্ডার, Sheet সংযোগের অবস্থা, দ্রুত কাজ।
// সব সংখ্যা আসল ডাটা থেকে — ডাটা না থাকলে ০।
import { useEffect, useState } from 'react'
import SellerShell, { STATUS_BN } from '../components/SellerShell.tsx'
import GoogleSheetsSettings from '../components/GoogleSheetsSettings.tsx'
import { useAuth } from '../lib/auth.tsx'
import {
  fetchDashboardStats,
  fetchSellerProducts,
  fetchSellerShop,
  type DashboardStats,
  type ProductListItem,
} from '../lib/products.ts'
import { formatBDT, formatCountBn, toBnDigits } from '../lib/pricing.ts'
import {
  fetchMySubscription,
  type MySubscription,
} from '../lib/subscription.ts'
import { navigate } from '../lib/router.ts'
import { requireSupabase } from '../lib/supabase.ts'
import {
  fetchSheetConnection,
  fetchSheetSyncSummary,
  type SheetConnection,
  type SheetSyncSummary,
} from '../lib/sheets.ts'
import {
  IconBell,
  IconBox,
  IconChart,
  IconChevronRight,
  IconDoc,
  IconShield,
  IconStore,
  IconSun,
  IconTruck,
  IconUser,
} from '../components/icons.tsx'
import type { ShopRow } from '../lib/types.ts'
import SetupWizard from './SetupWizard.tsx'
import SubscriptionSettings from '../components/SubscriptionSettings.tsx'

function formatDateTimeShort(iso: string): string {
  return new Date(iso).toLocaleString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function todayBnLong(): string {
  return new Date().toLocaleDateString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// দৈনিক বিক্রির বার চার্ট — লাইভ অ্যাপের মতো ঋজু সবুজ বার,
// শূন্য দিনে বার নেই, শূন্য নয় এমন বারের ওপরে মান লেখা।
function SalesChart({
  data,
  labels,
  showValues,
}: {
  data: number[]
  labels: string[]
  showValues: boolean
}) {
  const max = Math.max(1, ...data)
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5">
        {data.map((v, i) => (
          <div
            key={i}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            {showValues && v > 0 ? (
              <span className="whitespace-nowrap text-[11px] font-bold text-gray-600">
                {formatBDT(v)}
              </span>
            ) : (
              <span className="text-[11px]">&nbsp;</span>
            )}
            <div
              className="w-full max-w-10 rounded-t-lg bg-[#a7c9b8]"
              style={{ height: `${Math.max(0, (v / max) * 96)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-gray-200 pt-1.5">
        {labels.map((l, i) => (
          <span
            key={i}
            className={`min-w-0 flex-1 truncate text-center text-xs ${
              l === 'আজ'
                ? 'font-extrabold text-brand-dark'
                : 'text-gray-500'
            }`}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  )
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-[15px] font-extrabold">Google Sheet সংযোগ</h2>
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
            className="mt-3 text-sm font-bold text-brand-dark underline"
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
            className="mt-3 text-sm font-bold text-brand-dark underline"
          >
            Sheet বেছে নিন →
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
              className="text-sm font-bold text-brand-dark underline"
            >
              শিট খুলুন ↗
            </a>
            <button
              type="button"
              onClick={() => navigate('/dashboard/settings')}
              className="text-sm font-bold text-brand-dark underline"
            >
              সিঙ্কের অবস্থা দেখুন →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// সাম্প্রতিক অর্ডারে স্ট্যাটাস পিল — Orders পেজের StatusBadge-এর
// মতো একই রং, যাতে এক নজরে স্ট্যাটাস বোঝা যায়।
function StatusPill({ status }: { status: string }) {
  const color =
    status === 'new'
      ? 'bg-blue-100 text-blue-800'
      : status === 'cancelled'
        ? 'bg-red-100 text-red-800'
        : status === 'delivered'
          ? 'bg-green-100 text-green-800'
          : 'bg-amber-100 text-amber-800'
  return (
    <span
      className={`ml-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}
    >
      {STATUS_BN[status] ?? status}
    </span>
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
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [mySub, setMySub] = useState<MySubscription | null>(null)
  const [range, setRange] = useState<SalesRange>('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load() {
    if (!seller) return
    setLoading(true)
    setError('')
    Promise.all([
      fetchDashboardStats(seller.id),
      fetchSellerProducts(seller.id),
      fetchMySubscription(seller.id).catch(() => null),
    ])
      .then(([s, list, sub]) => {
        setStats(s)
        setProducts(list)
        setMySub(sub)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'লোড করা যায়নি।')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller])

  const rangeSales =
    range === 'today'
      ? (stats?.todaySales ?? 0)
      : range === '7d'
        ? (stats?.salesLast7Days ?? 0)
        : (stats?.salesLast30Days ?? 0)
  const rangeSalesLabel =
    range === '30d' ? 'গত ৩০ দিনের বিক্রি' : 'গত ৭ দিনের বিক্রি'

  const chartData =
    range === '30d'
      ? (stats?.dailySales30 ?? []).map((d) => d.total)
      : (stats?.dailySales7 ?? []).map((d) => d.total)
  const chartLabels =
    range === '30d'
      ? (stats?.dailySales30 ?? []).map((_d, i, arr) =>
          i === arr.length - 1 ? 'আজ' : '',
        )
      : (stats?.dailySales7 ?? []).map((d) => d.label)

  const statCards = [
    {
      label: 'আজকের অর্ডার',
      value: formatCountBn(stats?.todayOrders ?? 0),
      sub: `মোট অর্ডার ${formatCountBn(stats?.totalOrders ?? 0)}টি`,
      icon: <IconDoc className="h-4 w-4" />,
      to: '/dashboard/orders?date=today',
    },
    {
      label: 'নতুন অর্ডার',
      value: formatCountBn(stats?.newOrders ?? 0),
      sub: 'কনফার্ম করা বাকি আছে',
      icon: <IconBell className="h-4 w-4" />,
      to: '/dashboard/orders?status=new',
    },
    {
      label: 'আজকের বিক্রি',
      value: formatBDT(stats?.todaySales ?? 0),
      sub: `এই মাসের বিক্রি ${formatBDT(stats?.monthSales ?? 0)}`,
      icon: <IconChart className="h-4 w-4" />,
      to: '/dashboard/orders?date=today',
    },
    {
      label: 'সক্রিয় ল্যান্ডিং পেজ',
      value: formatCountBn(stats?.activePages ?? 0),
      sub: `মোট ${formatCountBn(stats?.totalPages ?? 0)}টি পেজ · ড্রাফট ${formatCountBn(stats?.draftPages ?? 0)}টি`,
      icon: <IconStore className="h-4 w-4" />,
      to: '/dashboard/products?filter=published',
    },
  ]

  return (
    <SellerShell active="dashboard">
      <h1 className="text-xl font-extrabold leading-tight text-gray-900 sm:text-2xl">
        স্বাগতম{seller?.shop_name ? `, ${seller.shop_name}` : ''}
      </h1>
      <p className="mt-1 text-sm text-gray-500">{todayBnLong()}</p>
      {/* বর্তমান প্ল্যান — সার্ভারের লাইভ সাবস্ক্রিপশন থেকে। */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-bold text-gray-700 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-brand" />
          {mySub?.plan ? `${mySub.plan.name} প্ল্যান` : 'ফ্রি প্ল্যান'} ·
          দোকান সক্রিয়
        </span>
        {/* ফোনে নতুন পেজ বানানোর বোতাম — ডেস্কটপে ওপরের বারে আছে */}
        <button
          type="button"
          onClick={() => navigate('/dashboard/products/new')}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-dark to-brand px-3.5 py-1.5 text-[13px] font-bold text-white shadow lg:hidden"
        >
          + নতুন ল্যান্ডিং পেজ
        </button>
      </div>

      {/* মেয়াদের সতর্কতা — আসল ডাটা থেকে। */}
      {mySub?.state === 'expiring' ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-2.5">
          <p className="text-sm font-bold text-amber-800">
            আপনার {mySub.plan?.name} প্যাকেজের মেয়াদ{' '}
            {toBnDigits(mySub.daysLeft)} দিন পর শেষ হবে।
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/settings')}
            className="rounded-xl bg-gradient-to-r from-brand-dark to-brand px-3.5 py-2 text-sm font-bold text-white shadow"
          >
            নবায়ন করুন →
          </button>
        </div>
      ) : null}
      {mySub?.state === 'grace' ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-2.5">
          <p className="text-sm font-bold text-amber-800">
            মেয়াদ শেষ হয়েছে — {toBnDigits(mySub.daysLeft)} দিনের গ্রেস
            চলছে। এর মধ্যে নবায়ন করলে সব পেজ চালু থাকবে।
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/settings')}
            className="rounded-xl bg-gradient-to-r from-brand-dark to-brand px-3.5 py-2 text-sm font-bold text-white shadow"
          >
            নবায়ন করুন →
          </button>
        </div>
      ) : null}
      {mySub?.state === 'expired' ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5">
          <p className="text-sm font-bold text-red-700">
            মেয়াদ শেষ — ফ্রি সার্ভিসে আছেন। শুধু ১টি পেজ চালু আছে, বাকিগুলো
            সাসপেন্ডেড।
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/settings')}
            className="rounded-xl bg-gradient-to-r from-brand-dark to-brand px-3.5 py-2 text-sm font-bold text-white shadow"
          >
            প্যাকেজ কিনুন →
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="animate-pulse" aria-busy="true" aria-label="লোড হচ্ছে">
          <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[99px] rounded-2xl bg-gray-200/70" />
            ))}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="h-64 rounded-2xl bg-gray-200/70" />
            <div className="h-64 rounded-2xl bg-gray-200/70" />
          </div>
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-bold text-red-700">{error}</p>
          <p className="mt-1 text-sm text-red-600">
            ইন্টারনেট দেখে আবার চেষ্টা করুন।
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {statCards.map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => navigate(card.to)}
                aria-label={`${card.label} — বিস্তারিত দেখুন`}
                className="rounded-2xl border border-gray-200 bg-white p-3.5 text-left shadow-sm transition hover:border-brand/40 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-[0.99] sm:p-4"
              >
                <span className="block whitespace-nowrap text-[13px] font-semibold leading-tight text-gray-500">
                  {card.label}
                </span>
                <span className="mt-1.5 flex items-end justify-between gap-2">
                  <span className="text-2xl font-extrabold leading-none text-gray-900">
                    {card.value}
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-mint text-brand-dark">
                    {card.icon}
                  </span>
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-gray-500">
                  {card.sub}
                </span>
              </button>
            ))}
          </div>

          {/* ডেস্কটপে দুই কলামের ওয়ার্কস্পেস: বামে বিক্রি + পেজ, ডানে
              সাম্প্রতিক অর্ডার + Sheet + দ্রুত কাজ। ফোনে আগের মতো এক কলামে
              একটার পর একটা। */}
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <div className="min-w-0 space-y-4">
          {/* বিক্রি ওভারভিউ */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-[15px] font-extrabold">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-mint text-brand-dark">
                  <IconChart className="h-4 w-4" />
                </span>
                বিক্রি ওভারভিউ
              </h2>
              <div className="flex rounded-full bg-gray-100 p-1">
                {(Object.keys(RANGE_LABEL) as SalesRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`rounded-full px-3 py-1 text-[13px] font-bold transition ${
                      range === r
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-500'
                    }`}
                  >
                    {RANGE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">আজকের বিক্রি</p>
                <p className="mt-0.5 text-xl font-extrabold">
                  {formatBDT(stats?.todaySales ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{rangeSalesLabel}</p>
                <p className="mt-0.5 text-xl font-extrabold">
                  {formatBDT(rangeSales)}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <SalesChart
                data={chartData}
                labels={chartLabels}
                showValues={range !== '30d'}
              />
            </div>
          </div>

          {/* আমার ল্যান্ডিং পেজ */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-extrabold">আমার ল্যান্ডিং পেজ</h2>
              <button
                type="button"
                onClick={() => navigate('/dashboard/products')}
                className="text-sm font-bold text-brand-dark"
              >
                সব দেখুন →
              </button>
            </div>
            {products.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">
                এখনো কোনো ল্যান্ডিং পেজ নেই — প্রথম প্রোডাক্ট যোগ করে বানান।
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {products.slice(0, 4).map((item) => (
                  <button
                    key={item.product.id}
                    type="button"
                    onClick={() =>
                      navigate(`/dashboard/products/${item.product.id}`)
                    }
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 p-2.5 text-left transition hover:border-brand/40"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                        <IconBox className="h-6 w-6" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {item.product.name}
                      </span>
                      <span className="mt-0.5 block text-sm font-bold text-brand-dark">
                        {formatBDT(item.product.price)}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                        item.page?.is_suspended
                          ? 'bg-amber-100 text-amber-800'
                          : item.page?.is_published
                            ? 'bg-brand-light text-brand-dark'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.page?.is_suspended
                        ? 'সাসপেন্ডেড'
                        : item.page?.is_published
                          ? 'প্রকাশিত'
                          : 'খসড়া'}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/dashboard/products/new')}
              className="mt-3 w-full rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25"
            >
              + নতুন ল্যান্ডিং পেজ তৈরি করুন
            </button>
          </div>

            </div>
            <div className="min-w-0 space-y-4 xl:sticky xl:top-20">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-[15px] font-extrabold">সাম্প্রতিক অর্ডার</h2>
              {!stats || stats.recentOrders.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  এখনো কোনো অর্ডার আসেনি।
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {stats.recentOrders.map((o) => (
                    <li
                      key={o.id}
                      className="flex justify-between gap-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-bold">{o.order_code}</span>
                        <StatusPill status={o.status} />
                        <span className="block text-gray-500">
                          {o.customer_name}
                        </span>
                      </span>
                      <span className="font-extrabold">
                        {formatBDT(o.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => navigate('/dashboard/orders')}
                className="mt-3 text-sm font-bold text-brand-dark"
              >
                সব অর্ডার দেখুন →
              </button>
            </div>
              <SheetStatusCard />
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-[15px] font-extrabold">দ্রুত কাজ</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/products/new')}
                    className="rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-4 py-2 text-sm font-bold text-white shadow"
                  >
                    নতুন প্রোডাক্ট যোগ করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/settings')}
                    className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold"
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

// ---------- সেটিংস ----------

type SettingsCategory =
  | 'shop'
  | 'delivery'
  | 'sheets'
  | 'account'
  | 'subscription'
  | 'security'
  | 'notifications'
  | 'appearance'

const SETTINGS_CATEGORIES: {
  id: SettingsCategory
  title: string
  sub: string
  icon: (className?: string) => React.ReactNode
}[] = [
  {
    id: 'shop',
    title: 'দোকানের সেটিংস',
    sub: 'নাম, লোগো, যোগাযোগ আর দোকানের লিংক',
    icon: (c) => <IconStore className={c} />,
  },
  {
    id: 'delivery',
    title: 'ডেলিভারি সেটিংস',
    sub: 'ঢাকার ভিতরে ও বাইরের চার্জ, সময় আর ফ্রি ডেলিভারি',
    icon: (c) => <IconTruck className={c} />,
  },
  {
    id: 'sheets',
    title: 'Google Sheets',
    sub: 'শিট কানেকশন, সিঙ্কের অবস্থা আর শেষ সিঙ্ক',
    icon: (c) => <IconDoc className={c} />,
  },
  {
    id: 'account',
    title: 'অ্যাকাউন্ট সেটিংস',
    sub: 'প্রোফাইল ছবি, নাম, ইমেইল আর নম্বর',
    icon: (c) => <IconUser className={c} />,
  },
  {
    id: 'subscription',
    title: 'সাবস্ক্রিপশন',
    sub: 'বর্তমান প্যাকেজ, ব্যবহার, প্যাকেজ বদল আর পেমেন্ট',
    icon: (c) => <IconDoc className={c} />,
  },
  {
    id: 'security',
    title: 'নিরাপত্তা ও গোপনীয়তা',
    sub: 'পাসওয়ার্ড, সেশন, ডেটা এক্সপোর্ট আর অ্যাকাউন্ট মোছা',
    icon: (c) => <IconShield className={c} />,
  },
  {
    id: 'notifications',
    title: 'নোটিফিকেশন সেটিংস',
    sub: 'কোন ঘটনায় কীভাবে জানানো হবে',
    icon: (c) => <IconBell className={c} />,
  },
  {
    id: 'appearance',
    title: 'অ্যাপিয়ারেন্স',
    sub: 'ভাষা আর প্যানেলের থিম',
    icon: (c) => <IconSun className={c} />,
  },
]

/** ডেলিভারি চার্জ + ফ্রি ডেলিভারির সীমা — shops টেবিলের আসল কলামে লেখে। */
function DeliverySettings({ shop }: { shop: ShopRow | null }) {
  const { seller } = useAuth()
  const [inside, setInside] = useState(
    shop ? String(Number(shop.delivery_inside_charge)) : '60',
  )
  const [outside, setOutside] = useState(
    shop ? String(Number(shop.delivery_outside_charge)) : '120',
  )
  const [freeThreshold, setFreeThreshold] = useState(
    shop ? String(Number(shop.free_delivery_threshold ?? 0)) : '0',
  )
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSaved(false)
    const insideNum = Number(inside)
    const outsideNum = Number(outside)
    const thresholdNum = Number(freeThreshold)
    if (
      !Number.isFinite(insideNum) ||
      insideNum < 0 ||
      !Number.isFinite(outsideNum) ||
      outsideNum < 0 ||
      !Number.isFinite(thresholdNum) ||
      thresholdNum < 0
    ) {
      setError('চার্জে সঠিক সংখ্যা দিন (০ বা তার বেশি)।')
      return
    }
    if (!seller) return
    setBusy(true)
    try {
      const client = requireSupabase()
      const { error: saveError } = await client
        .from('shops')
        .update({
          delivery_inside_charge: insideNum,
          delivery_outside_charge: outsideNum,
          free_delivery_threshold: thresholdNum,
        })
        .eq('seller_id', seller.id)
      if (saveError) throw saveError
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'সেভ করা যায়নি — আবার চেষ্টা করুন।',
      )
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'mt-1.5 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20'

  return (
    <form
      onSubmit={handleSave}
      className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-extrabold">ডেলিভারি সেটিংস</h2>
      {saved ? (
        <p className="mt-4 rounded-2xl bg-brand-light px-4 py-3 text-sm font-bold text-brand-dark">
          ডেলিভারি সেটিংস সেভ হয়েছে ✓
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-sm font-bold text-gray-800">
            ঢাকার ভেতরে ডেলিভারি চার্জ (৳)
          </span>
          <input
            type="number"
            required
            min={0}
            value={inside}
            onChange={(e) => setInside(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-gray-800">
            ঢাকার বাইরে ডেলিভারি চার্জ (৳)
          </span>
          <input
            type="number"
            required
            min={0}
            value={outside}
            onChange={(e) => setOutside(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-gray-800">
            ফ্রি ডেলিভারির সীমা (৳) — ০ মানে ফ্রি ডেলিভারি বন্ধ
          </span>
          <input
            type="number"
            required
            min={0}
            value={freeThreshold}
            onChange={(e) => setFreeThreshold(e.target.value)}
            className={inputClass}
          />
          <span className="mt-1.5 block text-sm text-gray-500">
            অর্ডারের মোট এই টাকার সমান বা বেশি হলে ডেলিভারি চার্জ লাগবে না।
          </span>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-4 py-3.5 font-bold text-white shadow-lg shadow-brand/25 disabled:opacity-50"
        >
          {busy ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
        </button>
      </div>
    </form>
  )
}

/**
 * যেসব সেটিংস ক্যাটাগরির ব্যাকএন্ড এখনো নেই (Phase 5/6) —
 * আসল তথ্য (শুধু পড়া যায়) + সত্য কথা, কোনো ভুয়া কন্ট্রোল নয়।
 */
function ReadOnlyPanel({
  title,
  rows,
  note,
  action,
}: {
  title: string
  rows: { label: string; value: string }[]
  note: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <dl className="mt-4 space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm"
          >
            <dt className="text-gray-500">{row.label}</dt>
            <dd className="font-bold text-gray-900">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-gray-500">{note}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function SettingsPage() {
  const { seller, user, signOut } = useAuth()
  const [shop, setShop] = useState<ShopRow | null>(null)
  const [shopLoaded, setShopLoaded] = useState(false)
  const [shopSaved, setShopSaved] = useState(false)
  const [category, setCategory] = useState<SettingsCategory>('shop')

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
      <h1 className="text-[28px] font-extrabold leading-tight text-gray-900 sm:text-3xl">
        সেটিংস
      </h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-gray-500">
        আপনার দোকান, ডেলিভারি, শিট কানেকশন আর অ্যাকাউন্ট — সব এক জায়গায়।
      </p>
      {shopSaved ? (
        <p className="mt-4 rounded-2xl bg-brand-light px-4 py-3 text-sm font-bold text-green-800">
          দোকানের তথ্য সেভ হয়েছে ✓
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
        {/* ক্যাটাগরির তালিকা — ডেস্কটপে স্ক্রলেও চোখের সামনে থাকে */}
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm lg:sticky lg:top-20">
          {SETTINGS_CATEGORIES.map((cat, i) => {
            const isActive = category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex w-full items-center gap-3.5 px-4 py-4 text-left transition ${
                  i > 0 ? 'border-t border-gray-100' : ''
                } ${isActive ? 'bg-brand-mint/60' : 'hover:bg-gray-50'}`}
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-mint text-brand-dark">
                  {cat.icon('h-6 w-6')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-extrabold leading-snug text-gray-900">
                    {cat.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-gray-500">
                    {cat.sub}
                  </span>
                </span>
                <IconChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
              </button>
            )
          })}
        </div>

        {/* নির্বাচিত ক্যাটাগরির বিবরণ */}
        <div>
          {category === 'shop' ? (
            !shopLoaded ? (
              <p className="text-sm text-gray-500">লোড হচ্ছে…</p>
            ) : (
              <SetupWizard
                compact
                initial={{
                  shopName: seller?.shop_name ?? '',
                  ownerName: seller?.owner_name ?? '',
                  whatsapp: (seller?.whatsapp ?? '').replace(/^880/, '0'),
                  slug: shop?.slug ?? '',
                  insideCharge: shop
                    ? Number(shop.delivery_inside_charge)
                    : 60,
                  outsideCharge: shop
                    ? Number(shop.delivery_outside_charge)
                    : 120,
                }}
                onDone={() => setShopSaved(true)}
              />
            )
          ) : null}

          {category === 'delivery' ? <DeliverySettings shop={shop} /> : null}

          {category === 'sheets' ? (
            <GoogleSheetsSettings shopName={seller?.shop_name ?? null} />
          ) : null}

          {category === 'account' ? (
            <ReadOnlyPanel
              title="অ্যাকাউন্ট সেটিংস"
              rows={[
                { label: 'আপনার নাম', value: seller?.owner_name ?? '—' },
                { label: 'দোকানের নাম', value: seller?.shop_name ?? '—' },
                { label: 'ইমেইল', value: user?.email ?? seller?.email ?? '—' },
                {
                  label: 'হোয়াটসঅ্যাপ',
                  value: seller?.whatsapp
                    ? `+${seller.whatsapp}`
                    : '—',
                },
              ]}
              note="প্রোফাইল ছবি যোগ করা ও এখান থেকে তথ্য বদলানো পরের ধাপে আসছে — এখন দোকানের নাম, লিংক আর যোগাযোগ বদলাতে দোকানের সেটিংস ব্যবহার করুন।"
            />
          ) : null}

          {category === 'subscription' ? <SubscriptionSettings /> : null}

          {category === 'security' ? (
            <ReadOnlyPanel
              title="নিরাপত্তা ও গোপনীয়তা"
              rows={[{ label: 'সাইন-ইন করা অ্যাকাউন্ট', value: user?.email ?? '—' }]}
              note="পাসওয়ার্ড বদলাতে লগআউট করে লগইন পেজের 'পাসওয়ার্ড ভুলে গেছেন?' ব্যবহার করুন — কোড যাবে আপনার ইমেইলে। সেশন দেখা, ডেটা এক্সপোর্ট আর অ্যাকাউন্ট মোছা পরের ধাপে আসছে।"
              action={
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold"
                >
                  লগআউট করুন
                </button>
              }
            />
          ) : null}

          {category === 'notifications' ? (
            <ReadOnlyPanel
              title="নোটিফিকেশন সেটিংস"
              rows={[
                {
                  label: 'নতুন অর্ডারের নোটিফিকেশন',
                  value: 'ড্যাশবোর্ডের বেল আইকনে',
                },
              ]}
              note="নতুন অর্ডার এলে ড্যাশবোর্ডের বেল আইকনে সংখ্যা দেখাবে। কোন ঘটনায় কীভাবে জানানো হবে — সেই টগলগুলো পরের ধাপে আসছে।"
            />
          ) : null}

          {category === 'appearance' ? (
            <ReadOnlyPanel
              title="অ্যাপিয়ারেন্স"
              rows={[
                { label: 'ভাষা', value: 'বাংলা' },
                { label: 'প্যানেলের থিম', value: 'হালকা (সবসময়)' },
              ]}
              note="সেলার প্যানেল সবসময় হালকা থিমে থাকে — ডিভাইসের ডার্ক মোড অনুসরণ করে না। ভাষা বদলানোর অপশন পরের ধাপে আসছে।"
            />
          ) : null}
        </div>
      </div>
    </SellerShell>
  )
}
