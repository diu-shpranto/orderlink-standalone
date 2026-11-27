// প্রোডাক্ট তালিকা (Landing Pages Management) — আসল সংখ্যা:
// মোট / প্রকাশিত / খসড়া, খোঁজা, কার্ডে URL + অর্ডার সংখ্যা +
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
import { formatBDT, formatCountBn } from '../lib/pricing.ts'
import { navigate } from '../lib/router.ts'

export default function Products() {
  const { seller } = useAuth()
  const [items, setItems] = useState<ProductListItem[]>([])
  const [shopSlug, setShopSlug] = useState('')
  const [query, setQuery] = useState('')
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

  const publishedCount = items.filter((i) => i.page?.is_published).length
  const filtered = items.filter((i) =>
    i.product.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  async function togglePublish(item: ProductListItem) {
    if (!item.page) return
    setBusyId(item.product.id)
    try {
      await setPagePublished(item.page.id, !item.page.is_published)
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

  return (
    <SellerShell active="products">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">আমার ল্যান্ডিং পেজ</h1>
        <button
          type="button"
          onClick={() => navigate('/dashboard/products/new')}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          + নতুন প্রোডাক্ট
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'মোট', value: items.length },
          { label: 'প্রকাশিত', value: publishedCount },
          { label: 'খসড়া', value: items.length - publishedCount },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-gray-200 bg-white p-4"
          >
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-1 text-2xl font-extrabold">
              {formatCountBn(c.value)}
            </p>
          </div>
        ))}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="প্রোডাক্টের নাম দিয়ে খুঁজুন…"
        className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2"
      />

      {notice ? (
        <p className="mt-4 rounded bg-brand-light px-4 py-3 text-sm text-brand-dark">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-gray-600">লোড হচ্ছে…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="font-bold">এখনো কোনো প্রোডাক্ট নেই</p>
          <p className="mt-1 text-sm text-gray-500">
            প্রথম প্রোডাক্ট যোগ করে আপনার ল্যান্ডিং পেজ বানান।
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/products/new')}
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            নতুন প্রোডাক্ট যোগ করুন
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const url = item.page
              ? `/${shopSlug}/${item.page.slug}`
              : ''
            return (
              <article
                key={item.product.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
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
                    <h2 className="font-bold leading-snug">
                      {item.product.name}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                        item.page?.is_published
                          ? 'bg-brand-light text-brand-dark'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.page?.is_published ? 'প্রকাশিত' : 'খসড়া'}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-extrabold">
                    {formatBDT(item.product.price)}
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
                      className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-white"
                    >
                      এডিট
                    </button>
                    {item.page ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold"
                      >
                        প্রিভিউ
                      </a>
                    ) : null}
                    {item.page ? (
                      <button
                        type="button"
                        onClick={() => copyLink(item)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold"
                      >
                        লিংক কপি
                      </button>
                    ) : null}
                    {item.page ? (
                      <button
                        type="button"
                        disabled={busyId === item.product.id}
                        onClick={() => void togglePublish(item)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold disabled:opacity-50"
                      >
                        {item.page.is_published ? 'খসড়া করুন' : 'প্রকাশ করুন'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === item.product.id}
                      onClick={() => void handleDelete(item)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 font-semibold text-red-600 disabled:opacity-50"
                    >
                      মুছুন
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </SellerShell>
  )
}
