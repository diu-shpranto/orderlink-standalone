// সেলারের অর্ডার ব্যবস্থাপনা — লাইভ অ্যাপের ডিজাইন অনুযায়ী:
// মোট অর্ডার + সর্বমোট বিক্রি, CSV ডাউনলোড, ৬টি স্ট্যাটাস কার্ড
// (ক্লিক করলে ছাঁকনি), Google Sheet কানেক্ট কার্ড, খোঁজা,
// স্ট্যাটাস + তারিখ + প্রোডাক্ট ছাঁকনি, বিস্তারিত ভিউ
// (স্ট্যাটাস পরিবর্তন, ইতিহাস, ভেতরের নোট, কল ও কপি)।
// বাল্ক পরিবর্তন / প্রিন্ট — পরের পলিশ, এখানে নেই।
import { useEffect, useMemo, useState } from 'react'
import SellerShell, { STATUS_BN } from '../components/SellerShell.tsx'
import { useAuth } from '../lib/auth.tsx'
import {
  NEXT_STATUS,
  computeOrderStats,
  countOrdersByPhone,
  fetchOrderEvents,
  fetchSellerOrders,
  filterOrders,
  updateOrderNotes,
  updateOrderStatus,
  type OrderFilters,
  type OrderStatus,
} from '../lib/orders.ts'
import { fetchSellerProducts } from '../lib/products.ts'
import { formatBDT, formatCountBn, todayDhaka, toBnDigits } from '../lib/pricing.ts'
import { SHEET_STATUS_BN, fetchSheetConnection } from '../lib/sheets.ts'
import type { SheetConnection } from '../lib/sheets.ts'
import { navigate } from '../lib/router.ts'
import { IconDoc, IconDownload, IconSearch } from '../components/icons.tsx'
import type { OrderEventRow, OrderRow, ProductRow } from '../lib/types.ts'

const PAGE_SIZE = 20

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('bn-BD', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: string }) {
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
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${color}`}
    >
      {STATUS_BN[status] ?? status}
    </span>
  )
}

/** ছাঁকনি করা অর্ডারের CSV — Sheet-এর কলাম অনুযায়ী। */
function downloadOrdersCsv(
  orders: OrderRow[],
  productNameById: Map<string, string>,
) {
  const headers = [
    'Order ID',
    'Date',
    'Customer Name',
    'Phone',
    'Product',
    'Quantity',
    'Unit Price',
    'Delivery Charge',
    'Total',
    'Address',
    'Status',
  ]
  const rows = orders.map((o) => {
    const address = [o.address_line, o.upazila, o.district, o.division]
      .filter((part) => part && part.trim().length > 0)
      .join(', ')
    const unitPrice =
      o.quantity > 0
        ? Math.round((Number(o.total) - Number(o.delivery_charge)) / o.quantity)
        : Number(o.total)
    return [
      o.order_code,
      formatDateTime(o.created_at),
      o.customer_name,
      o.customer_phone,
      o.product_id ? (productNameById.get(o.product_id) ?? '') : '',
      String(o.quantity),
      String(unitPrice),
      String(Number(o.delivery_charge)),
      String(Number(o.total)),
      address,
      STATUS_BN[o.status] ?? o.status,
    ]
  })
  const csv =
    '\uFEFF' +
    [headers, ...rows]
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders-${todayDhaka()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Google Sheet কানেক্ট কার্ড — যুক্ত না থাকলে লাইভ অ্যাপের মতো কার্ড,
 * যুক্ত থাকলে ছোট সবুজ অবস্থা। */
function SheetConnectCard() {
  const { seller } = useAuth()
  const [connection, setConnection] = useState<SheetConnection | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!seller) return
    fetchSheetConnection(seller.id)
      .then((conn) => setConnection(conn))
      .catch(() => setConnection(null))
      .finally(() => setLoaded(true))
  }, [seller])

  if (!loaded) return null
  if (connection?.sheet_id) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md">
          <IconDoc className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="font-extrabold">Google Sheet যুক্ত আছে ✓</p>
          <p className="mt-0.5 truncate text-sm text-gray-500">
            {connection.google_email ?? ''} — প্রতিটা অর্ডার অটোমেটিক শিটে
            জমা হচ্ছে।
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="mt-5 rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-3 text-lg font-extrabold">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-dark to-brand text-white shadow-md">
          <IconDoc className="h-6 w-6" />
        </span>
        Google Sheet কানেক্ট করুন
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
        কানেক্ট করলেই প্রতিটি অর্ডার অটোমেটিক আপনার শিটে জমা হবে — Order ID,
        কাস্টমারের নাম, ফোন, ঠিকানা, মোট টাকাসহ। প্রতিদিনের অর্ডার সেই দিনের
        নামের আলাদা ট্যাবে যায়।
      </p>
      <button
        type="button"
        onClick={() => navigate('/dashboard/settings')}
        className="mt-4 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25"
      >
        সেটিংসে গিয়ে কানেক্ট করুন
      </button>
    </div>
  )
}

function OrderDetail({
  order,
  productName,
  phoneOrderCount,
  onClose,
  onChanged,
}: {
  order: OrderRow
  productName: string | null
  phoneOrderCount: number
  onClose: () => void
  onChanged: () => void
}) {
  const [events, setEvents] = useState<OrderEventRow[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [notes, setNotes] = useState(order.internal_notes ?? '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setEventsLoading(true)
    fetchOrderEvents(order.id)
      .then((rows) => setEvents(rows))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false))
  }, [order.id])

  const nextStatus = NEXT_STATUS[order.status as OrderStatus]
  const canCancel =
    order.status === 'new' ||
    order.status === 'confirmed' ||
    order.status === 'processing' ||
    order.status === 'shipped'

  async function changeStatus(to: OrderStatus) {
    setError('')
    setBusy(true)
    try {
      await updateOrderStatus(order, to)
      setConfirmingCancel(false)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'স্ট্যাটাস বদলানো যায়নি।')
    } finally {
      setBusy(false)
    }
  }

  async function saveNotes() {
    setNotesSaving(true)
    setNotesSaved(false)
    try {
      await updateOrderNotes(order, notes.trim())
      setNotesSaved(true)
      onChanged()
    } catch {
      setError('নোট সেভ করা যায়নি।')
    } finally {
      setNotesSaving(false)
    }
  }

  function copyPhone() {
    const done = () => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(order.customer_phone).then(done, done)
    } else {
      done()
    }
  }

  const addressParts = [
    order.address_line,
    order.upazila,
    order.district,
    order.division,
  ]
    .filter((part) => part && part.trim().length > 0)
    .join(', ')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-xl sm:rounded-[28px] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">{order.order_code}</h2>
            <p className="text-sm text-gray-500">
              {formatDateTime(order.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-bold"
            aria-label="বন্ধ করুন"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <StatusBadge status={order.status} />
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        {phoneOrderCount > 1 ? (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            সতর্কতা: এই ফোন নম্বরে এই দোকানে মোট{' '}
            {toBnDigits(phoneOrderCount)}টি অর্ডার আছে — ডুপ্লিকেট হতে পারে।
          </p>
        ) : null}

        <div className="mt-4 space-y-2 rounded-2xl bg-cream px-4 py-3 text-sm">
          <p className="flex justify-between">
            <span className="text-gray-500">কাস্টমার</span>
            <span className="font-bold">{order.customer_name}</span>
          </p>
          <p className="flex items-center justify-between gap-2">
            <span className="text-gray-500">ফোন</span>
            <span className="flex items-center gap-2">
              <a
                href={`tel:${order.customer_phone}`}
                className="font-bold text-brand-dark"
              >
                {order.customer_phone}
              </a>
              <button
                type="button"
                onClick={copyPhone}
                className="rounded-lg border border-gray-300 bg-white px-2 py-0.5 text-xs font-bold"
              >
                {copied ? 'কপি হয়েছে ✓' : 'কপি'}
              </button>
            </span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="shrink-0 text-gray-500">ঠিকানা</span>
            <span className="text-right font-medium">{addressParts || '—'}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-500">ডেলিভারি এলাকা</span>
            <span className="font-medium">
              {order.delivery_area === 'inside' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'}
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-500">পণ্য</span>
            <span className="font-medium">{productName ?? '—'}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-500">পরিমাণ</span>
            <span className="font-medium">{toBnDigits(order.quantity)}টি</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-500">ডেলিভারি চার্জ</span>
            <span className="font-medium">
              {Number(order.delivery_charge) > 0
                ? formatBDT(Number(order.delivery_charge))
                : 'ফ্রি'}
            </span>
          </p>
          <p className="flex justify-between border-t border-gray-200 pt-2 text-base font-extrabold">
            <span>মোট</span>
            <span>{formatBDT(Number(order.total))}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-500">Google Sheet সিঙ্ক</span>
            <span className="font-medium">
              {SHEET_STATUS_BN[order.sheet_status] ?? order.sheet_status}
            </span>
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href={`tel:${order.customer_phone}`}
            className="flex-1 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-4 py-3 text-center text-sm font-bold text-white shadow"
          >
            কল করুন
          </a>
        </div>

        <div className="mt-5">
          <h3 className="font-extrabold">স্ট্যাটাস বদলান</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {nextStatus ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void changeStatus(nextStatus)}
                className="rounded-2xl bg-gradient-to-r from-brand-dark to-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {STATUS_BN[nextStatus] ?? nextStatus} করুন
              </button>
            ) : null}
            {canCancel ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmingCancel(true)}
                className="rounded-2xl border border-red-300 px-4 py-2.5 text-sm font-bold text-red-600 disabled:opacity-50"
              >
                বাতিল করুন
              </button>
            ) : null}
            {!nextStatus && !canCancel ? (
              <p className="text-sm text-gray-500">
                এই অর্ডারের স্ট্যাটাস আর বদলানো যাবে না।
              </p>
            ) : null}
          </div>
          {confirmingCancel ? (
            <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm">
              <p className="text-red-800">
                এই অর্ডারটি বাতিল করবেন? বাতিল হলে আর ফেরানো যাবে না।
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void changeStatus('cancelled')}
                  className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  হ্যাঁ, বাতিল করুন
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold"
                >
                  ফিরে যান
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <h3 className="font-extrabold">ভেতরের নোট (শুধু আপনি দেখবেন)</h3>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              setNotesSaved(false)
            }}
            className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="যেমন: কাস্টমারকে বিকেলে ফোন দিতে হবে।"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={notesSaving}
              onClick={() => void saveNotes()}
              className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {notesSaving ? 'সেভ হচ্ছে…' : 'নোট সেভ করুন'}
            </button>
            {notesSaved ? (
              <span className="text-sm font-bold text-brand">সেভ হয়েছে ✓</span>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="font-extrabold">স্ট্যাটাসের ইতিহাস</h3>
          {eventsLoading ? (
            <p className="mt-2 text-sm text-gray-500">লোড হচ্ছে…</p>
          ) : events.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              এখনো কোনো স্ট্যাটাস পরিবর্তন হয়নি।
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {events.map((ev) => (
                <li key={ev.id} className="flex justify-between gap-3 text-sm">
                  <span>
                    {ev.old_status
                      ? `${STATUS_BN[ev.old_status] ?? ev.old_status} → `
                      : ''}
                    <span className="font-bold">
                      {STATUS_BN[ev.new_status] ?? ev.new_status}
                    </span>
                  </span>
                  <span className="shrink-0 text-gray-500">
                    {formatDateTime(ev.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Orders() {
  const { seller } = useAuth()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    status: 'all',
    productId: 'all',
    dateFrom: '',
    dateTo: '',
  })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<OrderRow | null>(null)

  async function reload() {
    if (!seller) return
    setLoading(true)
    setError('')
    try {
      const [orderRows, productItems] = await Promise.all([
        fetchSellerOrders(seller.id),
        fetchSellerProducts(seller.id),
      ])
      setOrders(orderRows)
      setProducts(productItems.map((item) => item.product))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লোড করা যায়নি।')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller])

  useEffect(() => {
    setPage(1)
  }, [filters])

  const productNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of products) map.set(p.id, p.name)
    return map
  }, [products])

  const filtered = useMemo(
    () => filterOrders(orders, filters),
    [orders, filters],
  )
  const stats = useMemo(() => computeOrderStats(orders), [orders])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // স্ট্যাটাস কার্ডগুলোই ছাঁকনি — ক্লিক করলে সেই স্ট্যাটাসের অর্ডার দেখায়।
  const statCards: { label: string; value: string; status: string }[] = [
    { label: 'মোট অর্ডার', value: formatCountBn(stats.total), status: 'all' },
    { label: 'নতুন', value: formatCountBn(stats.newCount), status: 'new' },
    {
      label: 'কনফার্মড',
      value: formatCountBn(stats.confirmed),
      status: 'confirmed',
    },
    {
      label: 'প্রসেসিং',
      value: formatCountBn(stats.processing),
      status: 'processing',
    },
    {
      label: 'ডেলিভারড',
      value: formatCountBn(stats.delivered),
      status: 'delivered',
    },
    { label: 'বাতিল', value: formatCountBn(stats.cancelled), status: 'cancelled' },
  ]

  function setFilter(patch: Partial<OrderFilters>) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  return (
    <SellerShell active="orders">
      <h1 className="text-[28px] font-extrabold leading-tight text-gray-900 sm:text-3xl">
        অর্ডার
      </h1>
      <p className="mt-1.5 text-[15px] text-gray-500">
        মোট {formatCountBn(stats.total)}টি অর্ডার · সর্বমোট বিক্রি{' '}
        {formatBDT(stats.totalSales)}
      </p>

      <button
        type="button"
        onClick={() => downloadOrdersCsv(filtered, productNameById)}
        disabled={filtered.length === 0}
        className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-50"
      >
        <IconDownload className="h-4 w-4" />
        CSV ডাউনলোড
      </button>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {statCards.map((card) => {
          const isActive = filters.status === card.status
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => setFilter({ status: card.status })}
              className={`rounded-[24px] border bg-white p-4 text-left shadow-sm transition ${
                isActive
                  ? 'border-brand ring-2 ring-brand/60'
                  : 'border-gray-200'
              }`}
            >
              <p className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                {card.value}
              </p>
              <p className="mt-1 text-sm text-gray-500">{card.label}</p>
            </button>
          )
        })}
      </div>

      <SheetConnectCard />

      {loading ? (
        <p className="mt-6 text-gray-600">লোড হচ্ছে…</p>
      ) : error ? (
        <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : (
        <>
          <div className="mt-6 space-y-3 rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <IconSearch className="h-5 w-5" />
              </span>
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilter({ search: e.target.value })}
                placeholder="অর্ডার আইডি, নাম বা ফোন নম্বর দিয়ে খুঁজুন"
                className="w-full rounded-2xl border border-gray-300 py-3 pl-11 pr-4 text-[15px] placeholder:text-gray-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <select
                value={filters.productId}
                onChange={(e) => setFilter({ productId: e.target.value })}
                className="rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none"
              >
                <option value="all">সব প্রোডাক্ট</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <label className="block">
                <span className="text-xs text-gray-500">তারিখ থেকে</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilter({ dateFrom: e.target.value })}
                  className="mt-0.5 w-full rounded-2xl border border-gray-300 px-3 py-2.5 text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">তারিখ পর্যন্ত</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilter({ dateTo: e.target.value })}
                  className="mt-0.5 w-full rounded-2xl border border-gray-300 px-3 py-2.5 text-sm outline-none"
                />
              </label>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-6 rounded-[24px] border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
              কোনো অর্ডার পাওয়া যায়নি।
            </p>
          ) : (
            <>
              {/* ডেস্কটপ টেবিল */}
              <div className="mt-6 hidden overflow-x-auto rounded-[24px] border border-gray-200 bg-white shadow-sm md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="px-4 py-3">অর্ডার</th>
                      <th className="px-4 py-3">কাস্টমার</th>
                      <th className="px-4 py-3">ফোন</th>
                      <th className="px-4 py-3">পণ্য</th>
                      <th className="px-4 py-3">মোট</th>
                      <th className="px-4 py-3">স্ট্যাটাস</th>
                      <th className="px-4 py-3">তারিখ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageOrders.map((o) => (
                      <tr
                        key={o.id}
                        onClick={() => setSelected(o)}
                        className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 font-bold">
                          {o.order_code}
                        </td>
                        <td className="px-4 py-3">{o.customer_name}</td>
                        <td className="px-4 py-3">{o.customer_phone}</td>
                        <td className="px-4 py-3">
                          {o.product_id
                            ? (productNameById.get(o.product_id) ?? '—')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 font-extrabold">
                          {formatBDT(Number(o.total))}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDateTime(o.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ফোন কার্ড */}
              <div className="mt-6 space-y-3 md:hidden">
                {pageOrders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelected(o)}
                    className="block w-full rounded-[24px] border border-gray-200 bg-white p-4 text-left shadow-sm"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-extrabold">{o.order_code}</span>
                      <StatusBadge status={o.status} />
                    </span>
                    <span className="mt-2 block text-sm text-gray-600">
                      {o.customer_name} · {o.customer_phone}
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      {o.product_id
                        ? (productNameById.get(o.product_id) ?? '—')
                        : '—'}{' '}
                      · {toBnDigits(o.quantity)}টি
                    </span>
                    <span className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-extrabold">
                        {formatBDT(Number(o.total))}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(o.created_at)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
                  >
                    ← আগের পেজ
                  </button>
                  <span className="text-sm text-gray-600">
                    {toBnDigits(page)} / {toBnDigits(totalPages)}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
                  >
                    পরের পেজ →
                  </button>
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      {selected ? (
        <OrderDetail
          order={selected}
          productName={
            selected.product_id
              ? (productNameById.get(selected.product_id) ?? null)
              : null
          }
          phoneOrderCount={countOrdersByPhone(orders, selected.customer_phone)}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null)
            void reload()
          }}
        />
      ) : null}
    </SellerShell>
  )
}
