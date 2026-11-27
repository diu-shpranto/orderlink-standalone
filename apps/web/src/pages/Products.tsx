// প্রোডাক্ট তালিকা (Landing Pages Management) — লাইভ অ্যাপের ডিজাইন অনুযায়ী:
// বড় সবুজ "নতুন ল্যান্ডিং পেজ" বাটন, ৩টি স্ট্যাট কার্ড, খোঁজা,
// ফিল্টার পিল (সব/প্রকাশিত/খসড়া), ফটোসহ কার্ডে দাম + প্রকাশিত ব্যাজ।
// সব সংখ্যা আসল: মোট / প্রকাশিত / খসড়া, কার্ডে URL + অর্ডার সংখ্যা +
// প্রিভিউ / এডিট / লিংক কপি / প্রকাশ-খসড়া / মুছুন।
import { useEffect, useState } from 'react'
import SellerShell from '../components/SellerShell.tsx'
import { useAuth } from '../lib/auth.tsx'
import {
  deleteProduct,
  fetchSellerProducts,
  fetchSellerShop,
  setPagePublished,
  type ProductListItem,
} from '../lib/products.ts'
import { chooseKeptPage } from '../lib/subscription.ts'
import { formatBDT, formatCountBn } from '../lib/pricing.ts'
import { navigate } from '../lib/router.ts'
import { IconPlus, IconSearch } from '../components/icons.tsx'

type PageFilter = 'all' | 'published' | 'draft'
type ProductsView = 'grid' | 'table'

const VIEW_KEY = 'ol-products-view'

export default function Products() {
  const { seller } = useAuth()
  const [items, setItems] = useState<ProductListItem[]>([])
  const [shopSlug, setShopSlug] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PageFilter>('all')
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
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight text-gray-900 sm:text-3xl">
            আমার ল্যান্ডিং পেজ
          </h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-gray-500">
            আপনার তৈরি করা সব Product Landing Page পরিচালনা করুন।
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/products/new')}
          className="mt-5 flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-brand/25 lg:mt-0 lg:w-auto"
        >
          <IconPlus className="h-5 w-5" />
          নতুন ল্যান্ডিং পেজ তৈরি করুন
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'মোট পেজ', value: items.length },
          { label: 'পাবলিশড পেজ', value: publishedCount },
          { label: 'ড্রাফট পেজ', value: draftCount },
          { label: 'সাসপেন্ডেড পেজ', value: suspendedCount },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              {formatCountBn(c.value)}
            </p>
            <p className="mt-1 text-sm text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 lg:flex lg:items-center lg:gap-4">
        <div className="relative lg:min-w-0 lg:flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <IconSearch className="h-5 w-5" />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="পেজ বা পণ্যের নাম দিয়ে খুঁজুন"
            className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-[15px] placeholder:text-gray-400 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 lg:mt-0">
          {filterPills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilter(pill.id)}
              className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${
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

      {loading ? (
        <p className="mt-6 text-gray-600">লোড হচ্ছে…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="font-extrabold">এখনো কোনো প্রোডাক্ট নেই</p>
          <p className="mt-1 text-sm text-gray-500">
            প্রথম প্রোডাক্ট যোগ করে আপনার ল্যান্ডিং পেজ বানান।
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/products/new')}
            className="mt-4 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-4 py-2.5 text-sm font-bold text-white shadow"
          >
            নতুন প্রোডাক্ট যোগ করুন
          </button>
        </div>
      ) : (
        <>
          {view === 'table' ? (
            <div className="mt-5 hidden overflow-x-auto rounded-[24px] border border-gray-200 bg-white shadow-sm lg:block">
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
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              item.page?.is_suspended
                                ? 'bg-amber-100 text-amber-800'
                                : item.page?.is_published
                                  ? 'bg-brand-light text-brand-dark'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.page?.is_suspended
                              ? '● সাসপেন্ডেড'
                              : item.page?.is_published
                                ? '● প্রকাশিত'
                                : 'খসড়া'}
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
                              onClick={() => void handleDelete(item)}
                              className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 disabled:opacity-50"
                            >
                              মুছুন
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
            className={`mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${
              view === 'table' ? 'hidden lg:hidden' : ''
            }`}
          >
          {filtered.map((item) => {
            const url = item.page ? `/${shopSlug}/${item.page.slug}` : ''
            return (
              <article
                key={item.product.id}
                className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm"
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
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-[17px] font-extrabold leading-snug">
                      {item.product.name}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                        item.page?.is_suspended
                          ? 'bg-amber-100 text-amber-800'
                          : item.page?.is_published
                            ? 'bg-brand-light text-brand-dark'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.page?.is_suspended
                        ? '● সাসপেন্ডেড'
                        : item.page?.is_published
                          ? '● প্রকাশিত'
                          : 'খসড়া'}
                    </span>
                  </div>
                  <p className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-extrabold text-brand-dark">
                      {formatBDT(item.product.price)}
                    </span>
                    {item.product.old_price &&
                    Number(item.product.old_price) >
                      Number(item.product.price) ? (
                      <span className="text-sm text-gray-400 line-through">
                        {formatBDT(Number(item.product.old_price))}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-500" title={url}>
                    {url || '—'}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    অর্ডার: {formatCountBn(item.orderCount)}টি
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/dashboard/products/${item.product.id}`)
                      }
                      className="rounded-xl bg-gradient-to-r from-brand-dark to-brand px-3 py-1.5 font-bold text-white"
                    >
                      এডিট
                    </button>
                    {item.page ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-gray-300 px-3 py-1.5 font-bold"
                      >
                        প্রিভিউ
                      </a>
                    ) : null}
                    {item.page ? (
                      <button
                        type="button"
                        onClick={() => copyLink(item)}
                        className="rounded-xl border border-gray-300 px-3 py-1.5 font-bold"
                      >
                        লিংক কপি
                      </button>
                    ) : null}
                    {item.page ? (
                      <button
                        type="button"
                        disabled={busyId === item.product.id}
                        onClick={() => void togglePublish(item)}
                        className="rounded-xl border border-gray-300 px-3 py-1.5 font-bold disabled:opacity-50"
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
                      onClick={() => void handleDelete(item)}
                      className="rounded-xl border border-red-200 px-3 py-1.5 font-bold text-red-600 disabled:opacity-50"
                    >
                      মুছুন
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
        </>
      )}
    </SellerShell>
  )
}
