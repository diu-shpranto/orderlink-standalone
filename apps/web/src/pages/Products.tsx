// প্রোডাক্ট তালিকা (My Landing Pages) — প্রিমিয়াম মোবাইল-ফার্স্ট ডিজাইন:
// শিরোনাম + সাবটাইটেল, পূর্ণ-প্রস্থ সবুজ CTA, ৩টি কমপ্যাক্ট স্ট্যাট কার্ড,
// খোঁজা + স্ক্রলযোগ্য ফিল্টার পিল, ছবিসহ প্রিমিয়াম কার্ডে দাম + ছাড় +
// URL + টেমপ্লেট + অর্ডার + আপডেট + স্ট্যাটাস ব্যাজ। অ্যাকশন: এডিট /
// প্রিভিউ / লিংক কপি / অর্ডার দেখুন (প্রাথমিক), প্রকাশ-খসড়া টগল,
// ডুপ্লিকেট / মুছুন (শান্ত)। সব সংখ্যা আসল; ডেস্কটপে কার্ড/তালিকা টগল।
import { useEffect, useState } from 'react'
import SellerShell from '../components/SellerShell.tsx'
import { useAuth } from '../lib/auth.tsx'
import {
  deleteProduct,
  duplicateProduct,
  fetchSellerProducts,
  fetchSellerShop,
  setPagePublished,
  type ProductListItem,
} from '../lib/products.ts'
import { chooseKeptPage } from '../lib/subscription.ts'
import { formatBDT, formatCountBn } from '../lib/pricing.ts'
import { templateById } from '../lib/templates.ts'
import { navigate, useSearch } from '../lib/router.ts'
import {
  IconCopy,
  IconEye,
  IconPlus,
  IconReceipt,
  IconSearch,
  IconStore,
  IconX,
} from '../components/icons.tsx'

type PageFilter = 'all' | 'published' | 'draft'
type ProductsView = 'grid' | 'table'

const VIEW_KEY = 'ol-products-view'

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('bn-BD', {
      timeZone: 'Asia/Dhaka',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function statusBadge(item: ProductListItem) {
  if (item.page?.is_suspended) return 'bg-amber-100 text-amber-800'
  if (item.page?.is_published) return 'bg-[#e9f5ef] text-[#006B50]'
  return 'bg-gray-100 text-gray-600'
}

function statusLabel(item: ProductListItem) {
  if (item.page?.is_suspended) return '● সাসপেন্ডেড'
  if (item.page?.is_published) return '● প্রকাশিত'
  return 'খসড়া'
}

export default function Products() {
  const { seller } = useAuth()
  const [items, setItems] = useState<ProductListItem[]>([])
  const [shopSlug, setShopSlug] = useState('')
  const [shopId, setShopId] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PageFilter>('all')
  // ড্যাশবোর্ডের "সক্রিয় ল্যান্ডিং পেজ" কার্ড থেকে আসা ছাঁকনি —
  // ?filter=published — ঠিকানাতেই থাকে, রিফ্রেশেও হারায় না।
  const search = useSearch()
  useEffect(() => {
    const params = new URLSearchParams(search)
    const f = params.get('filter')
    const q = params.get('q')
    if (f === 'published' || f === 'draft' || f === 'all') setFilter(f)
    if (q !== null) setQuery(q)
  }, [search])
  // ডেস্কটপে কার্ড বা তালিকা — ফোনে সবসময় কার্ড।
  const [view, setView] = useState<ProductsView>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid'
    } catch {
      return 'grid'
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState('')

  async function load() {
    if (!seller) return
    setLoading(true)
    setError('')
    try {
      const [shop, list] = await Promise.all([
        fetchSellerShop(seller.id),
        fetchSellerProducts(seller.id),
      ])
      setShopSlug(shop?.slug ?? '')
      setShopId(shop?.id ?? '')
      setItems(list)
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

  const publishedCount = items.filter(
    (i) => i.page?.is_published && !i.page?.is_suspended,
  ).length
  const suspendedCount = items.filter((i) => i.page?.is_suspended).length
  const draftCount = items.length - publishedCount - suspendedCount
  const filtered = items.filter((i) => {
    const matchesQuery = i.product.name
      .toLowerCase()
      .includes(query.trim().toLowerCase())
    if (!matchesQuery) return false
    if (filter === 'published') return Boolean(i.page?.is_published)
    if (filter === 'draft') return !i.page?.is_published
    return true
  })

  const filterPills: { id: PageFilter; label: string; count: number }[] = [
    { id: 'all', label: 'সব পেজ', count: items.length },
    { id: 'published', label: 'পাবলিশড', count: publishedCount },
    { id: 'draft', label: 'ড্রাফট', count: draftCount },
  ]

  async function togglePublish(item: ProductListItem) {
    if (!item.page || !seller) return
    // সাসপেন্ডেড পেজ: "চালু রাখুন" মানে এই পেজটাই ফ্রি সার্ভিসে
    // চালু থাকবে, বাকি প্রকাশিত পেজ সাসপেন্ড হবে।
    if (item.page.is_suspended) {
      setBusyId(item.product.id)
      try {
        await chooseKeptPage(item.page.id)
        setNotice(`"${item.product.name}" পেজটি চালু রাখা হয়েছে।`)
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'বদলানো যায়নি।')
      } finally {
        setBusyId('')
      }
      return
    }
    setBusyId(item.product.id)
    try {
      await setPagePublished(
        item.page.id,
        !item.page.is_published,
        seller.id,
      )
      setNotice(
        item.page.is_published
          ? 'পেজটি খসড়া করা হয়েছে।'
          : 'পেজটি প্রকাশ করা হয়েছে।',
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'বদলানো যায়নি।')
    } finally {
      setBusyId('')
    }
  }

  async function handleDuplicate(item: ProductListItem) {
    if (!seller || !shopId) return
    setBusyId(item.product.id)
    try {
      await duplicateProduct(item.product.id, seller.id, shopId)
      setNotice(`"${item.product.name}"-এর কপি খসড়া হিসেবে তৈরি হয়েছে।`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'কপি করা যায়নি।')
    } finally {
      setBusyId('')
    }
  }

  async function handleDelete(item: ProductListItem) {
    if (
      !window.confirm(
        `"${item.product.name}" মুছে ফেলবেন? পেজ ও ছবিসহ সব মুছে যাবে।`,
      )
    ) {
      return
    }
    setBusyId(item.product.id)
    try {
      await deleteProduct(item.product.id)
      setNotice('প্রোডাক্ট মুছে ফেলা হয়েছে।')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'মোছা যায়নি।')
    } finally {
      setBusyId('')
    }
  }

  function copyLink(item: ProductListItem) {
    if (!item.page) return
    const url = `${window.location.origin}/${shopSlug}/${item.page.slug}`
    void navigator.clipboard.writeText(url).then(() => {
      setNotice('লিংক কপি হয়েছে।')
    })
  }

  function viewOrders(item: ProductListItem) {
    navigate(`/dashboard/orders?product=${item.product.id}`)
  }

  function changeView(next: ProductsView) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // ভিউ পছন্দ না থাকলেও তালিকা চলবে।
    }
  }

  return (
    <SellerShell active="products">
      {/* শিরোনাম + সবচেয়ে চোখে পড়া CTA */}
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-4">
        <div>
          <h1 className="text-[20px] font-extrabold leading-tight text-gray-900 sm:text-2xl">
            আমার ল্যান্ডিং পেজ
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            আপনার তৈরি করা সব Product Landing Page পরিচালনা করুন।
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/products/new')}
          className="mt-4 flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-brand/25 lg:mt-0 lg:w-auto"
        >
          <IconPlus className="h-5 w-5" />
          নতুন ল্যান্ডিং পেজ তৈরি করুন
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse" aria-label="লোড হচ্ছে">
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-[16px] border border-gray-200 bg-white p-3.5 shadow-sm"
              >
                <div className="h-3 w-3/4 rounded bg-gray-100" />
                <div className="mt-2.5 h-6 w-1/2 rounded bg-gray-100" />
              </div>
            ))}
          </div>
          <div className="mt-4 h-12 rounded-2xl bg-gray-100" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[16px] border border-gray-200 bg-white shadow-sm"
              >
                <div className="aspect-[4/3] bg-gray-100" />
                <div className="space-y-2.5 p-3.5">
                  <div className="h-4 w-3/4 rounded bg-gray-100" />
                  <div className="h-4 w-1/2 rounded bg-gray-100" />
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-10 rounded-xl bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {suspendedCount > 0 ? (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-amber-800">
              সাসপেন্ডেড: {formatCountBn(suspendedCount)}টি পেজ ফ্রি সার্ভিসে
              বন্ধ আছে — চালু রাখতে পেজের “চালু রাখুন” চাপুন।
            </p>
          ) : null}

          {/* খোঁজা + ছাঁকনি — ফোনে পিলগুলো পাশে স্ক্রল হয় */}
          <div className="mt-4 lg:flex lg:items-center lg:gap-4">
            <div className="relative lg:min-w-0 lg:flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <IconSearch className="h-5 w-5" />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="পেজ বা পণ্যের নাম দিয়ে খুঁজুন"
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-[15px] placeholder:text-gray-400 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:mt-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
              {filterPills.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFilter(pill.id)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition ${
                    filter === pill.id
                      ? 'bg-gradient-to-r from-brand-dark to-brand text-white shadow'
                      : 'border border-gray-200 bg-white text-gray-600 shadow-sm'
                  }`}
                >
                  {pill.label} · {formatCountBn(pill.count)}
                </button>
              ))}
            </div>

            {/* ডেস্কটপে কার্ড/তালিকা বদল — ফোনে দেখায় না */}
            <div className="mt-4 hidden shrink-0 rounded-full bg-gray-100 p-1 lg:mt-0 lg:flex">
              {(
                [
                  { id: 'grid', label: 'কার্ড' },
                  { id: 'table', label: 'তালিকা' },
                ] as { id: ProductsView; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => changeView(opt.id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                    view === opt.id
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {notice ? (
            <p className="mt-4 rounded-2xl bg-brand-light px-4 py-3 text-sm font-bold text-brand-dark">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          {items.length === 0 ? (
            <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-8 text-center shadow-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-mint text-brand-dark">
                <IconStore className="h-7 w-7" />
              </span>
              <p className="mt-4 text-base font-extrabold text-gray-900">
                আপনার এখনো কোনো ল্যান্ডিং পেজ নেই
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                প্রথম প্রোডাক্ট যোগ করে আপনার ল্যান্ডিং পেজ বানান।
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/products/new')}
                className="mt-5 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25"
              >
                প্রথম ল্যান্ডিং পেজ তৈরি করুন
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-base font-extrabold text-gray-900">
                খুঁজে কিছু পাওয়া যায়নি
              </p>
              <p className="mt-1 text-sm text-gray-500">
                অন্য নামে খুঁজুন বা ছাঁকনি বদলান।
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setFilter('all')
                }}
                className="mt-4 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold"
              >
                ছাঁকনি পরিষ্কার করুন
              </button>
            </div>
          ) : (
            <>
              {view === 'table' ? (
                <div className="mt-4 hidden overflow-x-auto rounded-[16px] border border-gray-200 bg-white shadow-sm lg:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="px-4 py-3">পণ্য</th>
                        <th className="px-4 py-3">দাম</th>
                        <th className="px-4 py-3">স্ট্যাটাস</th>
                        <th className="px-4 py-3">অর্ডার</th>
                        <th className="px-4 py-3">লিংক</th>
                        <th className="px-4 py-3">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => {
                        const url = item.page
                          ? `/${shopSlug}/${item.page.slug}`
                          : ''
                        return (
                          <tr
                            key={item.product.id}
                            className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-3">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt=""
                                    className="h-11 w-11 shrink-0 rounded-xl object-cover"
                                  />
                                ) : (
                                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">
                                    ছবি নেই
                                  </span>
                                )}
                                <span className="font-extrabold">
                                  {item.product.name}
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-extrabold text-brand-dark">
                                {formatBDT(item.product.price)}
                              </span>
                              {item.product.old_price &&
                              Number(item.product.old_price) >
                                Number(item.product.price) ? (
                                <span className="ml-2 text-gray-400 line-through">
                                  {formatBDT(Number(item.product.old_price))}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(item)}`}
                              >
                                {statusLabel(item)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {formatCountBn(item.orderCount)}টি
                            </td>
                            <td className="max-w-48 truncate px-4 py-3 text-gray-500">
                              {url || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/dashboard/products/${item.product.id}`,
                                    )
                                  }
                                  className="rounded-lg bg-gradient-to-r from-brand-dark to-brand px-2.5 py-1.5 text-xs font-bold text-white"
                                >
                                  এডিট
                                </button>
                                {item.page ? (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-bold"
                                  >
                                    প্রিভিউ
                                  </a>
                                ) : null}
                                {item.page ? (
                                  <button
                                    type="button"
                                    onClick={() => copyLink(item)}
                                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-bold"
                                  >
                                    লিংক কপি
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => viewOrders(item)}
                                  className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-bold"
                                >
                                  অর্ডার দেখুন
                                </button>
                                {item.page ? (
                                  <button
                                    type="button"
                                    disabled={busyId === item.product.id}
                                    onClick={() => void togglePublish(item)}
                                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-bold disabled:opacity-50"
                                  >
                                    {item.page.is_suspended
                                      ? 'চালু রাখুন'
                                      : item.page.is_published
                                        ? 'খসড়া করুন'
                                        : 'প্রকাশ করুন'}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={busyId === item.product.id}
                                  onClick={() => void handleDuplicate(item)}
                                  className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-bold disabled:opacity-50"
                                >
                                  ডুপ্লিকেট
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === item.product.id}
                                  onClick={() => void handleDelete(item)}
                                  className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 disabled:opacity-50"
                                >
                                  ডিলিট
                                </button>
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <div
                className={`mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${
                  view === 'table' ? 'hidden lg:hidden' : ''
                }`}
              >
                {filtered.map((item) => {
                  const url = item.page
                    ? `/${shopSlug}/${item.page.slug}`
                    : ''
                  const fullUrl = url
                    ? `${window.location.origin.replace(/^https?:\/\//, '')}${url}`
                    : ''
                  const updated = formatUpdatedAt(item.product.updated_at)
                  const isLive = Boolean(
                    item.page?.is_published && !item.page?.is_suspended,
                  )
                  return (
                    <article
                      key={item.product.id}
                      className="overflow-hidden rounded-[16px] border border-gray-200 bg-white shadow-sm"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.product.name}
                          className="aspect-[4/3] w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[4/3] w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
                          ছবি নেই
                        </div>
                      )}
                      <div className="p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="line-clamp-2 text-[15px] font-extrabold leading-snug text-gray-900">
                            {item.product.name}
                          </h2>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(item)}`}
                          >
                            {statusLabel(item)}
                          </span>
                        </div>
                        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-lg font-extrabold text-brand-dark">
                            {formatBDT(item.product.price)}
                          </span>
                          {item.product.old_price &&
                          Number(item.product.old_price) >
                            Number(item.product.price) ? (
                            <span className="text-[13px] text-gray-400 line-through">
                              {formatBDT(Number(item.product.old_price))}
                            </span>
                          ) : null}
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-gray-500">
                          <p className="truncate" title={fullUrl}>
                            {fullUrl || '—'}
                          </p>
                          {item.page ? (
                            <p>
                              {templateById(item.page.template)?.nameBn ??
                                '—'}
                            </p>
                          ) : null}
                          <p>
                            {formatCountBn(item.orderCount)}টি অর্ডার এসেছে
                          </p>
                          <p>পেজ ভিউ: এখনো ট্র্যাক করা হয় না</p>
                          {updated ? <p>শেষ আপডেট: {updated}</p> : null}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/dashboard/products/${item.product.id}`,
                              )
                            }
                            className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-gradient-to-r from-brand-dark to-brand px-2.5 py-2.5 text-sm font-bold text-white shadow-sm"
                          >
                            এডিট
                          </button>
                          {item.page ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 whitespace-nowrap rounded-xl border border-gray-300 px-2.5 py-2.5 text-sm font-bold text-gray-700"
                            >
                              <IconEye className="h-4 w-4 shrink-0" />
                              প্রিভিউ
                            </a>
                          ) : null}
                          {item.page ? (
                            <button
                              type="button"
                              onClick={() => copyLink(item)}
                              className="flex items-center gap-1 whitespace-nowrap rounded-xl border border-gray-300 px-2.5 py-2.5 text-sm font-bold text-gray-700"
                            >
                              <IconCopy className="h-4 w-4 shrink-0" />
                              লিংক কপি
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => viewOrders(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-700"
                          >
                            <IconReceipt className="h-4 w-4" />
                            অর্ডার দেখুন
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                          {item.page ? (
                            <span className="flex items-center gap-2">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isLive}
                                aria-label={
                                  item.page.is_suspended
                                    ? 'সাসপেন্ডেড — চালু রাখুন'
                                    : isLive
                                      ? 'প্রকাশিত — খসড়া করতে চাপুন'
                                      : 'খসড়া — প্রকাশ করতে চাপুন'
                                }
                                disabled={busyId === item.product.id}
                                onClick={() => void togglePublish(item)}
                                className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
                                  isLive ? 'bg-brand' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                    isLive ? 'left-[22px]' : 'left-0.5'
                                  }`}
                                />
                              </button>
                              <span
                                className={`text-sm font-bold ${
                                  item.page.is_suspended
                                    ? 'text-amber-700'
                                    : isLive
                                      ? 'text-gray-800'
                                      : 'text-gray-500'
                                }`}
                              >
                                {item.page.is_suspended
                                  ? 'সাসপেন্ডেড'
                                  : isLive
                                    ? 'পাবলিশড'
                                    : 'খসড়া'}
                              </span>
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-gray-500">
                              খসড়া
                            </span>
                          )}
                          <span className="flex items-center gap-4">
                            <button
                              type="button"
                              disabled={busyId === item.product.id}
                              onClick={() => void handleDuplicate(item)}
                              className="flex items-center gap-1 text-xs font-bold text-gray-500 transition hover:text-gray-800 disabled:opacity-50"
                            >
                              <IconCopy className="h-3.5 w-3.5" />
                              ডুপ্লিকেট
                            </button>
                            <button
                              type="button"
                              disabled={busyId === item.product.id}
                              onClick={() => void handleDelete(item)}
                              className="flex items-center gap-1 text-xs font-bold text-red-500 transition hover:text-red-700 disabled:opacity-50"
                            >
                              <IconX className="h-3.5 w-3.5" />
                              ডিলিট
                            </button>
                          </span>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
              <p className="mt-4 text-center text-sm text-gray-500">
                মোট {formatCountBn(items.length)}টি পেজের মধ্যে{' '}
                {formatCountBn(filtered.length)}টি দেখানো হচ্ছে
              </p>
            </>
          )}
        </>
      )}
    </SellerShell>
  )
}
