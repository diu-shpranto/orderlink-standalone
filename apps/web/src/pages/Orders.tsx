// সেলার অর্ডার ব্যবস্থাপনা — প্রিমিয়াম মোবাইল-ফার্স্ট রিডিজাইন:
// ২০px শিরোনাম, ৬টি কমপ্যাক্ট স্ট্যাটাস কার্ড (ক্লিক করলে ছাঁকনি),
// Google Sheet কানেক্ট কার্ড (আসল সিঙ্ক সংখ্যা + শেষ সিঙ্কসহ),
// খোঁজা + স্ট্যাটাস পিল + প্রোডাক্ট/তারিখ ছাঁকনি, অর্ডার কার্ড
// (চেকবক্স, কাস্টমার, ফোন, ঠিকানা, শিটের অবস্থা, বিস্তারিত,
// ইনলাইন স্ট্যাটাস), বাল্ক স্ট্যাটাস + বাল্ক CSV, বিস্তারিত মোডাল
// (স্ট্যাটাস পরিবর্তন, ইতিহাস, ভেতরের নোট, কল ও কপি)।
// স্ট্যাটাসের নিয়ম আগের মতোই — New → Confirmed → Processing →
// Shipped → Delivered, বা বাতিল; ভুল পরিবর্তন সার্ভারও ফেরায়।
// "Returned" স্ট্যাটাস এই অ্যাপে নেই, তাই তার ছাঁকনি যোগ করা হয়নি।
import { useEffect, useMemo, useState } from 'react'
import SellerShell, { STATUS_BN } from '../components/SellerShell.tsx'
import { useAuth } from '../lib/auth.tsx'
import {
  NEXT_STATUS,
  canTransition,
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
import {
  SHEET_STATUS_BN,
  fetchSheetConnection,
  fetchSheetSyncSummary,
  triggerOrderSync,
} from '../lib/sheets.ts'
import type { SheetConnection, SheetSyncSummary } from '../lib/sheets.ts'
import { navigate, useSearch } from '../lib/router.ts'
import {
  IconCheck,
  IconCopy,
  IconDoc,
  IconDownload,
  IconEye,
  IconPhone,
  IconSearch,
} from '../components/icons.tsx'
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

const STATUS_COLOR: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-violet-100 text-violet-800',
  processing: 'bg-amber-100 text-amber-800',
  shipped: 'bg-sky-100 text-sky-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {STATUS_BN[status] ?? status}
    </span>
  )
}

/** শিটের অবস্থার ছোট ব্যাজ — সিঙ্ক হয়েছে সবুজ, বাকি অ্যাম্বার/ধূসর। */
function SheetBadge({ sheetStatus }: { sheetStatus: string }) {
  if (sheetStatus === 'synced') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
        <IconCheck className="h-3.5 w-3.5" />
        Sheet-এ গেছে
      </span>
    )
  }
  const color =
    sheetStatus === 'failed'
      ? 'bg-red-100 text-red-800'
      : sheetStatus === 'not_connected'
        ? 'bg-gray-100 text-gray-600'
        : 'bg-amber-100 text-amber-800'
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${color}`}
    >
      {SHEET_STATUS_BN[sheetStatus] ?? sheetStatus}
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

function copyText(text: string, done: () => void) {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).then(done, done)
  } else {
    done()
  }
}

/** Google Sheet কানেক্ট কার্ড — যুক্ত থাকলে আসল সিঙ্ক সংখ্যা +
 * শেষ সিঙ্কের সময়সহ সবুজ অবস্থা; না থাকলে কানেক্টের কার্ড। */
function SheetConnectCard() {
  const { seller } = useAuth()
  const [connection, setConnection] = useState<SheetConnection | null>(null)
  const [summary, setSummary] = useState<SheetSyncSummary | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!seller) return
    fetchSheetConnection(seller.id)
      .then((conn) => {
        setConnection(conn)
        if (conn?.sheet_id) {
          return fetchSheetSyncSummary(seller.id).then(setSummary)
        }
        return undefined
      })
      .catch(() => setConnection(null))
      .finally(() => setLoaded(true))
  }, [seller])

  if (!loaded) return null
  if (connection?.sheet_id) {
    return (
      <div className="mt-4 rounded-[20px] border border-green-200 bg-green-50/60 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md">
            <IconDoc className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-green-900">
              Google Sheet যুক্ত আছে ✓
            </p>
            <p className="mt-0.5 truncate text-sm text-gray-600">
              {connection.google_email ?? ''}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
              {summary ? (
                <>
                  সিঙ্ক হয়েছে{' '}
                  <span className="font-bold text-gray-800">
                    {toBnDigits(summary.synced)}টি
                  </span>
                  {' · '}অপেক্ষায়{' '}
                  <span className="font-bold text-gray-800">
                    {toBnDigits(summary.pending)}টি
                  </span>
                  {summary.failed > 0 ? (
                    <>
                      {' · '}ব্যর্থ{' '}
                      <span className="font-bold text-red-700">
                        {toBnDigits(summary.failed)}টি
                      </span>
                    </>
                  ) : null}
                  {summary.lastSyncedAt ? (
                    <>
                      <br />
                      শেষ সিঙ্ক: {formatDateTime(summary.lastSyncedAt)}
                    </>
                  ) : null}
                </>
              ) : (
                'প্রতিটা অর্ডার অটোমেটিক শিটে জমা হচ্ছে।'
              )}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/settings')}
              className="mt-2 text-sm font-bold text-brand-dark underline underline-offset-2"
            >
              সেটিংসে সিঙ্ক দেখুন →
            </button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="mt-4 rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-3 text-[17px] font-extrabold">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-dark to-brand text-white shadow-md">
          <IconDoc className="h-5 w-5" />
        </span>
        Google Sheet কানেক্ট করুন
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        কানেক্ট করলেই প্রতিটি অর্ডার অটোমেটিক আপনার শিটে জমা হবে — Order ID,
        কাস্টমারের নাম, ফোন, ঠিকানা, মোট টাকাসহ। প্রতিদিনের অর্ডার সেই দিনের
        নামের আলাদা ট্যাবে যায়।
      </p>
      <button
        type="button"
        onClick={() => navigate('/dashboard/settings')}
        className="mt-3 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25"
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
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

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

  const addressParts = [
    order.address_line,
    order.upazila,
    order.district,
    order.division,
  ]
    .filter((part) => part && part.trim().length > 0)
    .join(', ')

  const unitPrice =
    order.quantity > 0
      ? Math.round(
          (Number(order.total) - Number(order.delivery_charge)) /
            order.quantity,
        )
      : Number(order.total)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-xl sm:rounded-[28px] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold">
              {order.order_code}
              <button
                type="button"
                onClick={() =>
                  copyText(order.order_code, () => {
                    setCopiedCode(true)
                    window.setTimeout(() => setCopiedCode(false), 2000)
                  })
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600"
                title="অর্ডার আইডি কপি করুন"
                aria-label="অর্ডার আইডি কপি করুন"
              >
                <IconCopy className="h-3.5 w-3.5" />
              </button>
              {copiedCode ? (
                <span className="text-xs font-bold text-brand">
                  কপি হয়েছে ✓
                </span>
              ) : null}
            </h2>
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <SheetBadge sheetStatus={order.sheet_status} />
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
                onClick={() =>
                  copyText(order.customer_phone, () => {
                    setCopiedPhone(true)
                    window.setTimeout(() => setCopiedPhone(false), 2000)
                  })
                }
                className="rounded-lg border border-gray-300 bg-white px-2 py-0.5 text-xs font-bold"
              >
                {copiedPhone ? 'কপি হয়েছে ✓' : 'কপি'}
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
            <span className="text-gray-500">একক দাম</span>
            <span className="font-medium">{formatBDT(unitPrice)}</span>
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

        <div className="mt-4">
          <a
            href={`tel:${order.customer_phone}`}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-4 py-3 text-sm font-bold text-white shadow"
          >
            <IconPhone className="h-4 w-4" />
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
            <ul className="mt-3 space-y-3 border-l-2 border-brand-mint pl-4">
              {events.map((ev) => (
                <li key={ev.id} className="relative text-sm">
                  <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-white" />
                  <span>
                    {ev.old_status
                      ? `${STATUS_BN[ev.old_status] ?? ev.old_status} → `
                      : ''}
                    <span className="font-bold">
                      {STATUS_BN[ev.new_status] ?? ev.new_status}
                    </span>
                  </span>
                  <span className="block text-xs text-gray-500">
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

const STATUS_PILLS: { key: string; label: string }[] = [
  { key: 'all', label: 'সব' },
  { key: 'new', label: STATUS_BN.new },
  { key: 'confirmed', label: STATUS_BN.confirmed },
  { key: 'processing', label: STATUS_BN.processing },
  { key: 'shipped', label: STATUS_BN.shipped },
  { key: 'delivered', label: STATUS_BN.delivered },
  { key: 'cancelled', label: STATUS_BN.cancelled },
]

const BULK_TARGETS: { key: OrderStatus; label: string }[] = [
  { key: 'confirmed', label: STATUS_BN.confirmed },
  { key: 'processing', label: STATUS_BN.processing },
  { key: 'shipped', label: STATUS_BN.shipped },
  { key: 'delivered', label: STATUS_BN.delivered },
  { key: 'cancelled', label: STATUS_BN.cancelled },
]

const STAT_DOT: Record<string, string> = {
  all: 'bg-gray-900',
  new: 'bg-blue-600',
  confirmed: 'bg-violet-600',
  processing: 'bg-amber-500',
  delivered: 'bg-green-600',
  cancelled: 'bg-red-500',
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
  // "শিটে যায়নি" — শিটে এখনো যায়নি এমন অর্ডারগুলোই দেখায়।
  const [syncFilter, setSyncFilter] = useState<'all' | 'unsynced'>('all')
  // ড্যাশবোর্ডের স্ট্যাট কার্ড / ওপরের খোঁজা / পণ্যের পেজ থেকে আসা ছাঁকনি —
  // ?status=new, ?date=today, ?q=..., ?product=<id> — ঠিকানাতেই থাকে, তাই
  // রিফ্রেশ করলেও ছাঁকনি হারায় না। প্যারামিটার না থাকলে
  // ব্যবহারকারীর হাতে বদলানো ছাঁকনিতে হাত দেওয়া হয় না।
  const search = useSearch()
  useEffect(() => {
    const params = new URLSearchParams(search)
    const status = params.get('status')
    const date = params.get('date')
    const q = params.get('q')
    const product = params.get('product')
    if (status === null && date === null && q === null && product === null)
      return
    setFilters((f) => {
      const next = { ...f }
      if (
        status !== null &&
        ['all', 'new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)
      ) {
        next.status = status
      }
      if (date === 'today') {
        next.dateFrom = todayDhaka()
        next.dateTo = todayDhaka()
      }
      if (q !== null) next.search = q
      if (product !== null && product !== '') next.productId = product
      return next
    })
  }, [search])
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<OrderRow | null>(null)
  // ডেস্কটপ টেবিলের ইনলাইন কাজ — মোডাল না খুলেই পরের ধাপ / কল / কপি।
  const [inlineBusyId, setInlineBusyId] = useState('')
  const [inlineError, setInlineError] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [copiedCodeId, setCopiedCodeId] = useState('')
  // বাল্ক নির্বাচন — অর্ডার id-র সেট।
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTarget, setBulkTarget] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')
  // শিটে আবার পাঠানো (কার্ডের "আবার পাঠান")।
  const [resendingId, setResendingId] = useState('')
  const [resentNote, setResentNote] = useState('')

  async function advanceInline(order: OrderRow) {
    const next = NEXT_STATUS[order.status as OrderStatus]
    if (!next) return
    setInlineError('')
    setInlineBusyId(order.id)
    try {
      await updateOrderStatus(order, next)
      await reload()
    } catch (err) {
      setInlineError(
        err instanceof Error ? err.message : 'স্ট্যাটাস বদলানো যায়নি।',
      )
    } finally {
      setInlineBusyId('')
    }
  }

  /** কার্ডের স্ট্যাটাস ড্রপডাউন — পরের ধাপ সরাসরি, বাতিল হলে
   * নিশ্চিতকরণের জন্য বিস্তারিত মোডাল খোলে। */
  async function changeStatusFromCard(order: OrderRow, value: string) {
    if (value === 'cancelled') {
      setSelected(order)
      return
    }
    if (!canTransition(order.status, value)) return
    setInlineError('')
    setInlineBusyId(order.id)
    try {
      await updateOrderStatus(order, value as OrderStatus)
      await reload()
    } catch (err) {
      setInlineError(
        err instanceof Error ? err.message : 'স্ট্যাটাস বদলানো যায়নি।',
      )
    } finally {
      setInlineBusyId('')
    }
  }

  function copyPhoneInline(order: OrderRow) {
    const done = () => {
      setCopiedId(order.id)
      window.setTimeout(() => setCopiedId(''), 2000)
    }
    copyText(order.customer_phone, done)
  }

  function copyCodeInline(order: OrderRow) {
    const done = () => {
      setCopiedCodeId(order.id)
      window.setTimeout(() => setCopiedCodeId(''), 2000)
    }
    copyText(order.order_code, done)
  }

  /** শিটে আবার পাঠান — সিঙ্ক ফায়ার-অ্যান্ড-ফরগেট, তারপর অবস্থা
   * তাজা করতে তালিকা আবার লোড হয়। */
  function resendSheet(order: OrderRow) {
    setResendingId(order.id)
    setResentNote('')
    triggerOrderSync(order.id)
    window.setTimeout(() => {
      setResendingId('')
      setResentNote('আবার পাঠানোর চেষ্টা করা হয়েছে — অবস্থা দেখে নিন।')
      void reload()
    }, 2500)
  }

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
  }, [filters, syncFilter])

  const productNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of products) map.set(p.id, p.name)
    return map
  }, [products])

  const filtered = useMemo(() => {
    const base = filterOrders(orders, filters)
    if (syncFilter === 'unsynced') {
      return base.filter((o) => o.sheet_status !== 'synced')
    }
    return base
  }, [orders, filters, syncFilter])
  const stats = useMemo(() => computeOrderStats(orders), [orders])
  const shippedCount = useMemo(
    () => orders.filter((o) => o.status === 'shipped').length,
    [orders],
  )
  const unsyncedCount = useMemo(
    () => orders.filter((o) => o.sheet_status !== 'synced').length,
    [orders],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.has(o.id)),
    [orders, selectedIds],
  )

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(filtered.map((o) => o.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setBulkMessage('')
    setBulkTarget('')
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((o) => selectedIds.has(o.id))

  /** বাল্ক স্ট্যাটাস — শুধু যেসব অর্ডারে ওই পরিবর্তন নিয়মমাফিক
   * হয় সেগুলোই বদলায়; বাকিগুলো বাদ যায়, গুনে জানানো হয়। */
  async function applyBulkStatus() {
    if (!bulkTarget || selectedOrders.length === 0 || bulkBusy) return
    const target = bulkTarget as OrderStatus
    setBulkBusy(true)
    setBulkMessage('')
    let applied = 0
    let skipped = 0
    for (const order of selectedOrders) {
      if (!canTransition(order.status, target)) {
        skipped += 1
        continue
      }
      try {
        await updateOrderStatus(order, target)
        applied += 1
      } catch {
        skipped += 1
      }
    }
    setBulkBusy(false)
    setBulkTarget('')
    setSelectedIds(new Set())
    setBulkMessage(
      applied > 0
        ? `${toBnDigits(applied)}টি অর্ডারের স্ট্যাটাস বদলানো হয়েছে` +
            (skipped > 0
              ? ` — ${toBnDigits(skipped)}টি বাদ গেছে (সেই স্ট্যাটাস থেকে বদলানো যায় না)।`
              : '।')
        : 'কোনো অর্ডারের স্ট্যাটাস বদলানো যায়নি — নির্বাচিত অর্ডারগুলো থেকে এই ধাপে যাওয়া যায় না।',
    )
    await reload()
  }

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

  const pillCount = (key: string): number => {
    if (key === 'all') return stats.total
    if (key === 'new') return stats.newCount
    if (key === 'confirmed') return stats.confirmed
    if (key === 'processing') return stats.processing
    if (key === 'shipped') return shippedCount
    if (key === 'delivered') return stats.delivered
    if (key === 'cancelled') return stats.cancelled
    return 0
  }

  return (
    <SellerShell active="orders">
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-4">
        <div>
          <h1 className="text-xl font-extrabold leading-tight text-gray-900">
            অর্ডার
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            সব অর্ডার দেখুন এবং পরিচালনা করুন।
          </p>
          <p className="mt-0.5 text-sm text-gray-500">
            মোট {formatCountBn(stats.total)}টি অর্ডার · সর্বমোট বিক্রি{' '}
            {formatBDT(stats.totalSales)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadOrdersCsv(filtered, productNameById)}
          disabled={filtered.length === 0}
          className="mt-4 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-50 lg:mt-0 lg:w-auto"
        >
          <IconDownload className="h-4 w-4" />
          CSV ডাউনলোড
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => {
          const isActive = filters.status === card.status
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => setFilter({ status: card.status })}
              className={`rounded-[20px] border bg-white p-3.5 text-left shadow-sm transition ${
                isActive
                  ? 'border-brand ring-2 ring-brand/60'
                  : 'border-gray-200'
              }`}
            >
              <p className="flex items-center gap-2 text-[22px] font-extrabold leading-none text-gray-900">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${STAT_DOT[card.status] ?? 'bg-gray-400'}`}
                />
                {card.value}
              </p>
              <p className="mt-1.5 text-[13px] font-medium text-gray-500">
                {card.label}
              </p>
            </button>
          )
        })}
      </div>

      <SheetConnectCard />

      {loading ? (
        <div aria-label="লোড হচ্ছে" className="mt-5 space-y-3">
          <div className="h-[104px] animate-pulse rounded-[20px] bg-gray-200/70" />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[148px] animate-pulse rounded-[20px] bg-gray-200/70"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="mt-5 rounded-[20px] border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-3 rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-[20px] border border-gray-200 bg-white p-3 shadow-sm">
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
            <div className="mt-2 grid grid-cols-2 gap-2 lg:flex lg:gap-2">
              <label className="block lg:w-52">
                <span className="text-[11px] font-medium leading-tight text-gray-500">
                  পণ্য / ল্যান্ডিং পেজ
                </span>
                <select
                  value={filters.productId}
                  onChange={(e) => setFilter({ productId: e.target.value })}
                  className="mt-0.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none"
                >
                  <option value="all">সব পণ্য</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block lg:w-40">
                <span className="text-[11px] font-medium leading-tight text-gray-500">
                  তারিখ থেকে
                </span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilter({ dateFrom: e.target.value })}
                  className="mt-0.5 w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm outline-none"
                />
              </label>
              <label className="block lg:w-40">
                <span className="text-[11px] font-medium leading-tight text-gray-500">
                  তারিখ পর্যন্ত
                </span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilter({ dateTo: e.target.value })}
                  className="mt-0.5 w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm outline-none"
                />
              </label>
            </div>
            <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
              {STATUS_PILLS.map((pill) => {
                const isActive =
                  syncFilter === 'all' && filters.status === pill.key
                return (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => {
                      setSyncFilter('all')
                      setFilter({ status: pill.key })
                    }}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-bold transition ${
                      isActive
                        ? 'bg-brand text-white shadow-md shadow-brand/25'
                        : 'border border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {pill.label} · {toBnDigits(pillCount(pill.key))}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setSyncFilter((s) => (s === 'unsynced' ? 'all' : 'unsynced'))}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-bold transition ${
                  syncFilter === 'unsynced'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                    : 'border border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                শিটে যায়নি · {toBnDigits(unsyncedCount)}
              </button>
            </div>
          </div>

          {resentNote ? (
            <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              {resentNote}
            </p>
          ) : null}

          {filtered.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-gray-200 bg-white p-6 text-center shadow-sm">
              <p className="font-extrabold">
                {orders.length === 0
                  ? 'এখনো কোনো অর্ডার আসেনি।'
                  : 'খুঁজে কিছু পাওয়া যায়নি।'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {orders.length === 0
                  ? 'কাস্টমার আপনার ল্যান্ডিং পেজ থেকে অর্ডার করলেই এখানে দেখা যাবে।'
                  : 'অন্য কিছু খুঁজে দেখুন, বা ছাঁকনি বদলে নিন।'}
              </p>
              {orders.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setFilters({
                      search: '',
                      status: 'all',
                      productId: 'all',
                      dateFrom: '',
                      dateTo: '',
                    })
                    setSyncFilter('all')
                  }}
                  className="mt-4 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold"
                >
                  ছাঁকনি পরিষ্কার করুন
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {inlineError ? (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {inlineError}
                </p>
              ) : null}
              <div className="mt-4 flex items-center gap-2 px-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={() => {
                      if (allFilteredSelected) clearSelection()
                      else selectAllFiltered()
                    }}
                    className="h-5 w-5 shrink-0 accent-brand"
                    aria-label="সব অর্ডার নির্বাচন করুন"
                  />
                  সব নির্বাচন করুন
                </label>
                <span className="text-sm text-gray-500">
                  ({formatCountBn(filtered.length)}টি)
                </span>
                {selectedIds.size > 0 ? (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="ml-auto text-sm font-bold text-red-600"
                  >
                    নির্বাচন বাতিল করুন
                  </button>
                ) : null}
              </div>

              {/* ডেস্কটপ টেবিল — চেকবক্স + ইনলাইন কাজসহ: পরের ধাপ, কল, কপি।
                  বিস্তারিত (নোট/ইতিহাস/বাতিল) এখনো সারিতে ক্লিক করলে খোলে। */}
              <div className="mt-4 hidden overflow-x-auto rounded-[20px] border border-gray-200 bg-white shadow-sm md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={
                            pageOrders.length > 0 &&
                            pageOrders.every((o) => selectedIds.has(o.id))
                          }
                          onChange={() => {
                            const allPage = pageOrders.every((o) =>
                              selectedIds.has(o.id),
                            )
                            setSelectedIds((prev) => {
                              const next = new Set(prev)
                              for (const o of pageOrders) {
                                if (allPage) next.delete(o.id)
                                else next.add(o.id)
                              }
                              return next
                            })
                          }}
                          className="h-4 w-4 accent-brand"
                          aria-label="এই পেজের সব অর্ডার নির্বাচন করুন"
                        />
                      </th>
                      <th className="px-4 py-3">অর্ডার</th>
                      <th className="px-4 py-3">কাস্টমার</th>
                      <th className="px-4 py-3">ফোন</th>
                      <th className="px-4 py-3">পণ্য</th>
                      <th className="px-4 py-3">পরিমাণ</th>
                      <th className="px-4 py-3">মোট</th>
                      <th className="px-4 py-3">স্ট্যাটাস</th>
                      <th className="px-4 py-3">তারিখ</th>
                      <th className="px-4 py-3">দ্রুত কাজ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageOrders.map((o) => {
                      const next = NEXT_STATUS[o.status as OrderStatus]
                      return (
                        <tr
                          key={o.id}
                          onClick={() => setSelected(o)}
                          className={`cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                            selectedIds.has(o.id) ? 'bg-brand-mint/40' : ''
                          }`}
                        >
                          <td
                            className="px-3 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.has(o.id)}
                              onChange={() => toggleSelect(o.id)}
                              className="h-4 w-4 accent-brand"
                              aria-label={`${o.order_code} নির্বাচন করুন`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 font-bold">
                              {o.order_code}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyCodeInline(o)
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                title="অর্ডার আইডি কপি করুন"
                                aria-label="অর্ডার আইডি কপি করুন"
                              >
                                <IconCopy className="h-3.5 w-3.5" />
                              </button>
                              {copiedCodeId === o.id ? (
                                <span className="text-xs font-bold text-brand">
                                  কপি ✓
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td className="px-4 py-3">{o.customer_name}</td>
                          <td className="px-4 py-3">{o.customer_phone}</td>
                          <td className="px-4 py-3">
                            {o.product_id
                              ? (productNameById.get(o.product_id) ?? '—')
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {toBnDigits(o.quantity)}টি
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
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="flex items-center gap-1.5">
                              {next ? (
                                <button
                                  type="button"
                                  disabled={inlineBusyId === o.id}
                                  onClick={() => void advanceInline(o)}
                                  className="whitespace-nowrap rounded-lg bg-gradient-to-r from-brand-dark to-brand px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                                  title="পরের ধাপে নিন"
                                >
                                  → {STATUS_BN[next] ?? next}
                                </button>
                              ) : null}
                              <a
                                href={`tel:${o.customer_phone}`}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-brand-dark"
                                title="কল করুন"
                                aria-label="কল করুন"
                              >
                                <IconPhone className="h-4 w-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => copyPhoneInline(o)}
                                className="whitespace-nowrap rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                                title="ফোন নম্বর কপি করুন"
                              >
                                {copiedId === o.id ? 'কপি হয়েছে ✓' : 'কপি'}
                              </button>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ফোন কার্ড — চেকবক্স, কাস্টমার, ফোন, ঠিকানা,
                  শিটের অবস্থা, মোট, বিস্তারিত ও স্ট্যাটাস বদল। */}
              <div className="mt-4 space-y-3 md:hidden">
                {pageOrders.map((o) => {
                  const next = NEXT_STATUS[o.status as OrderStatus]
                  const canCancel =
                    o.status === 'new' ||
                    o.status === 'confirmed' ||
                    o.status === 'processing' ||
                    o.status === 'shipped'
                  const addressParts = [
                    o.address_line,
                    o.upazila,
                    o.district,
                    o.division,
                  ]
                    .filter((part) => part && part.trim().length > 0)
                    .join(', ')
                  return (
                    <article
                      key={o.id}
                      className={`rounded-[20px] border bg-white p-4 shadow-sm ${
                        selectedIds.has(o.id)
                          ? 'border-brand ring-1 ring-brand/50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(o.id)}
                          onChange={() => toggleSelect(o.id)}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
                          aria-label={`${o.order_code} নির্বাচন করুন`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 font-extrabold">
                              <span className="truncate">{o.order_code}</span>
                              <button
                                type="button"
                                onClick={() => copyCodeInline(o)}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                title="অর্ডার আইডি কপি করুন"
                                aria-label="অর্ডার আইডি কপি করুন"
                              >
                                <IconCopy className="h-3.5 w-3.5" />
                              </button>
                              {copiedCodeId === o.id ? (
                                <span className="shrink-0 text-xs font-bold text-brand">
                                  কপি ✓
                                </span>
                              ) : null}
                            </span>
                            <StatusBadge status={o.status} />
                          </div>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {formatDateTime(o.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <SheetBadge sheetStatus={o.sheet_status} />
                        {o.sheet_status === 'pending' ||
                        o.sheet_status === 'failed' ? (
                          <button
                            type="button"
                            disabled={resendingId === o.id}
                            onClick={() => resendSheet(o)}
                            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                          >
                            {resendingId === o.id
                              ? 'পাঠানো হচ্ছে…'
                              : '↻ আবার পাঠান'}
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <p className="font-bold">{o.customer_name}</p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                          <a
                            href={`tel:${o.customer_phone}`}
                            className="font-bold text-brand-dark"
                          >
                            {o.customer_phone}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyPhoneInline(o)}
                            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-bold"
                          >
                            {copiedId === o.id ? 'কপি হয়েছে ✓' : 'কপি'}
                          </button>
                          <a
                            href={`tel:${o.customer_phone}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-mint text-brand-dark"
                            title="কল করুন"
                            aria-label="কল করুন"
                          >
                            <IconPhone className="h-4 w-4" />
                          </a>
                        </p>
                        {addressParts ? (
                          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                            {addressParts}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-sm text-gray-500">
                          ডেলিভারি এলাকা:{' '}
                          {o.delivery_area === 'inside'
                            ? 'ঢাকার ভেতরে'
                            : 'ঢাকার বাইরে'}
                        </p>
                        <p className="mt-2 text-sm">
                          <span className="font-bold">
                            {o.product_id
                              ? (productNameById.get(o.product_id) ?? '—')
                              : '—'}
                          </span>
                          <span className="text-gray-500">
                            {' '}
                            · পরিমাণ: {toBnDigits(o.quantity)}টি
                          </span>
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                        <span className="text-lg font-extrabold">
                          {formatBDT(Number(o.total))}
                        </span>
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelected(o)}
                            className="flex items-center gap-1.5 rounded-2xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-bold"
                          >
                            <IconEye className="h-4 w-4" />
                            বিস্তারিত
                          </button>
                          {next || canCancel ? (
                            <select
                              value={o.status}
                              onChange={(e) =>
                                void changeStatusFromCard(o, e.target.value)
                              }
                              disabled={inlineBusyId === o.id}
                              className="max-w-[132px] truncate rounded-2xl border border-brand bg-brand-mint px-2.5 py-2 text-sm font-bold text-brand-dark outline-none disabled:opacity-50"
                              aria-label="স্ট্যাটাস বদলান"
                            >
                              <option value={o.status} disabled>
                                {STATUS_BN[o.status] ?? o.status}
                              </option>
                              {next ? (
                                <option value={next}>
                                  → {STATUS_BN[next] ?? next}
                                </option>
                              ) : null}
                              {canCancel ? (
                                <option value="cancelled">বাতিল করুন</option>
                              ) : null}
                            </select>
                          ) : null}
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>

              <p className="mt-4 text-center text-sm text-gray-500">
                মোট {formatCountBn(filtered.length)}টি অর্ডারের মধ্যে{' '}
                {formatCountBn(pageOrders.length)}টি দেখানো হচ্ছে
              </p>

              {totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-center gap-3">
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

      {/* বাল্ক বার — শুধু নির্বাচিত অর্ডার থাকলেই দেখায়। */}
      {selectedIds.size > 0 ? (
        <div className="fixed bottom-[76px] left-4 right-4 z-40 lg:bottom-6 lg:left-auto lg:right-10 lg:w-[560px]">
          {bulkMessage ? (
            <p className="mb-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
              {bulkMessage}
            </p>
          ) : null}
          <div className="rounded-[20px] border border-gray-200 bg-white p-3 shadow-xl">
            <p className="text-sm font-extrabold">
              {toBnDigits(selectedIds.size)}টি অর্ডার নির্বাচিত
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <select
                value={bulkTarget}
                onChange={(e) => setBulkTarget(e.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold outline-none"
                aria-label="বাল্ক স্ট্যাটাস বেছে নিন"
              >
                <option value="">স্ট্যাটাস বেছে নিন</option>
                {BULK_TARGETS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label} করুন
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!bulkTarget || bulkBusy}
                onClick={() => void applyBulkStatus()}
                className="rounded-2xl bg-gradient-to-r from-brand-dark to-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {bulkBusy ? 'বদলানো হচ্ছে…' : 'বদলান'}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadOrdersCsv(selectedOrders, productNameById)
                }
                className="flex items-center gap-1.5 rounded-2xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-bold"
              >
                <IconDownload className="h-4 w-4" />
                CSV
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-2xl px-3 py-2.5 text-sm font-bold text-red-600"
              >
                ছাড়ুন
              </button>
            </div>
          </div>
        </div>
      ) : bulkMessage ? (
        <p className="fixed bottom-[76px] left-4 right-4 z-40 rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg lg:bottom-6 lg:left-auto lg:right-10 lg:w-[560px]">
          {bulkMessage}
        </p>
      ) : null}

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
