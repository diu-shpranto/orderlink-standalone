// সেলার প্যানেলের শেল — লাইভ অ্যাপের মতো:
// ডেস্কটপে বাম সাইডবার (ভাঁজ করা যায় ৭৬px আইকন রেলে — localStorage
// 'ol-sidebar-collapsed'), ফোনে ওপরে হেডার (লোগো টাইল + দোকানের নাম +
// বেল + অ্যাভাটার) আর নিচে ট্যাব বার (হোম / পণ্য / অর্ডার / সেটিংস)।
// থিম সবসময় হালকা (pinned light) — ডিভাইসের ডার্ক মোড অনুসরণ করে না।
// বেলের সংখ্যা আসল নতুন অর্ডারের সংখ্যা (orders টেবিল থেকে)।
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../lib/auth.tsx'
import { fetchDashboardStats } from '../lib/products.ts'
import { formatBDT, formatCountBn, toBnDigits } from '../lib/pricing.ts'
import { navigate } from '../lib/router.ts'
import {
  fetchMySubscription,
  type MySubscription,
} from '../lib/subscription.ts'
import { LogoTile, LogoWordmark } from './Logo.tsx'
import {
  IconBell,
  IconBox,
  IconChevronRight,
  IconHome,
  IconLogout,
  IconReceipt,
  IconSearch,
  IconSettings,
} from './icons.tsx'
import type { OrderRow } from '../lib/types.ts'

export type SellerTab = 'dashboard' | 'products' | 'orders' | 'settings'

export const STATUS_BN: Record<string, string> = {
  new: 'নতুন',
  confirmed: 'নিশ্চিত',
  processing: 'প্রস্তুত হচ্ছে',
  shipped: 'পাঠানো হয়েছে',
  delivered: 'ডেলিভার করা হয়েছে',
  cancelled: 'বাতিল',
}

const TABS: {
  id: SellerTab
  label: string
  shortLabel: string
  to: string
  section: 'main' | 'shop'
  icon: (className?: string) => React.ReactNode
}[] = [
  {
    id: 'dashboard',
    label: 'ড্যাশবোর্ড',
    shortLabel: 'হোম',
    to: '/dashboard',
    section: 'main',
    icon: (c) => <IconHome className={c} />,
  },
  {
    id: 'products',
    label: 'পণ্য',
    shortLabel: 'পণ্য',
    to: '/dashboard/products',
    section: 'main',
    icon: (c) => <IconBox className={c} />,
  },
  {
    id: 'orders',
    label: 'অর্ডার',
    shortLabel: 'অর্ডার',
    to: '/dashboard/orders',
    section: 'main',
    icon: (c) => <IconReceipt className={c} />,
  },
  {
    id: 'settings',
    label: 'সেটিংস',
    shortLabel: 'সেটিংস',
    to: '/dashboard/settings',
    section: 'shop',
    icon: (c) => <IconSettings className={c} />,
  },
]

const COLLAPSE_KEY = 'ol-sidebar-collapsed'

export default function SellerShell({
  active,
  children,
}: {
  active: SellerTab
  children: React.ReactNode
}) {
  const { seller, user, signOut } = useAuth()
  const [newOrders, setNewOrders] = useState<OrderRow[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [topQuery, setTopQuery] = useState('')
  const [mySub, setMySub] = useState<MySubscription | null>(null)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (!seller) return
    let mounted = true
    fetchDashboardStats(seller.id)
      .then((stats) => {
        if (mounted) setNewOrders(stats.newOrderList)
      })
      .catch(() => {
        // বেল না খুললে ড্যাশবোর্ড থামবে না — সংখ্যা ০ দেখাবে।
      })
    fetchMySubscription(seller.id)
      .then((sub) => {
        if (mounted) setMySub(sub)
      })
      .catch(() => {
        // প্ল্যান না জানা গেলে চিপটা দেখাবে না — ভুল তথ্য দেখাবে না।
      })
    return () => {
      mounted = false
    }
  }, [seller])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setBellOpen(false)
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        // ভাঁজ অবস্থা না থাকলেও প্যানেল চলবে।
      }
      return next
    })
  }

  const shopName = seller?.shop_name ?? 'আমার দোকান'

  const bellButton = (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setBellOpen((open) => !open)
          setMenuOpen(false)
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm"
        aria-label="নোটিফিকেশন"
      >
        <IconBell className="h-5 w-5" />
        {newOrders.length > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {formatCountBn(newOrders.length)}
          </span>
        ) : null}
      </button>
      {bellOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setBellOpen(false)}
                aria-label="বন্ধ করুন"
              />
              <div className="fixed inset-x-4 top-[68px] z-50 rounded-3xl border border-gray-200 bg-white shadow-xl lg:inset-x-auto lg:right-10 lg:top-[72px] lg:w-96 xl:right-12">
                <p className="border-b border-gray-100 px-4 py-3 text-sm font-bold">
                  নতুন অর্ডার
                </p>
                {newOrders.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-gray-500">
                    নতুন কোনো অর্ডার নেই।
                  </p>
                ) : (
                  <ul className="max-h-64 overflow-y-auto">
                    {newOrders.map((o) => (
                      <li
                        key={o.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setBellOpen(false)
                            navigate(
                              `/dashboard/orders?order=${encodeURIComponent(o.order_code)}`,
                            )
                          }}
                          className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-sm transition hover:bg-gray-50 active:bg-gray-100"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">
                              {o.order_code} · {o.customer_name}
                            </span>
                            <span className="block text-gray-500">
                              {formatBDT(o.total)}
                            </span>
                          </span>
                          <IconChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )

  const avatarButton = (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setMenuOpen((open) => !open)
          setBellOpen(false)
        }}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white shadow-md"
        aria-label="প্রোফাইল"
      >
        {shopName.charAt(0)}
      </button>
      {menuOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuOpen(false)}
                aria-label="বন্ধ করুন"
              />
              <div className="fixed right-4 top-[68px] z-50 w-60 rounded-3xl border border-gray-200 bg-white shadow-xl lg:right-10 lg:top-[72px] xl:right-12">
            <p className="border-b border-gray-100 px-4 py-3 text-sm">
              <span className="block font-bold">{shopName}</span>
              <span className="text-gray-500">{user?.email ?? ''}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                navigate('/dashboard/settings')
              }}
              className="block w-full px-4 py-3 text-left text-sm font-medium hover:bg-gray-50"
            >
              সেটিংস
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="block w-full rounded-b-3xl px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-gray-50"
            >
              লগআউট
            </button>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )

  return (
    <div className="min-h-screen bg-cream text-gray-900 lg:flex">
      {/* ডেস্কটপ সাইডবার — পুরো লেবেলসহ, ভাঁজ করা যায় ৭৬px আইকন রেলে */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-gray-200 bg-white lg:flex ${
          collapsed ? 'w-[76px]' : 'w-72'
        }`}
      >
        <div
          className={`flex items-center gap-2 border-b border-gray-100 px-4 py-4 ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          {collapsed ? (
            <LogoTile size={40} />
          ) : (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              aria-label="ড্যাশবোর্ড"
            >
              <LogoWordmark size={30} />
            </button>
          )}
        </div>

        {/* দোকানের কার্ড + বর্তমান প্ল্যান */}
        <div className="border-b border-gray-100 px-3 py-4">
          {collapsed ? (
            <div className="flex justify-center" title={shopName}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white">
                {shopName.charAt(0)}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-cream px-3 py-3">
                <LogoTile size={40} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-extrabold">
                    {shopName}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {user?.email ?? ''}
                  </p>
                </div>
              </div>
              {mySub ? (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/settings')}
                  className="mt-2 flex w-full items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2.5 text-left text-sm font-bold text-gray-700 transition hover:border-brand/40"
                  title="সাবস্ক্রিপশন দেখুন"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      mySub.state === 'expired'
                        ? 'bg-red-500'
                        : mySub.state === 'grace' ||
                            mySub.state === 'expiring'
                          ? 'bg-amber-500'
                          : 'bg-brand'
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {mySub.plan ? `${mySub.plan.name} প্ল্যান` : 'ফ্রি প্ল্যান'}
                    {mySub.state === 'expiring' ||
                    mySub.state === 'grace'
                      ? ` · ${toBnDigits(mySub.daysLeft)} দিন বাকি`
                      : ''}
                  </span>
                  <IconChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                </button>
              ) : null}
            </>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {(['main', 'shop'] as const).map((section) => (
            <div key={section} className={section === 'shop' ? 'mt-5' : ''}>
              {collapsed ? null : (
                <p className="px-3 pb-2 text-xs font-extrabold uppercase tracking-wide text-gray-400">
                  {section === 'main' ? 'প্রধান' : 'দোকান'}
                </p>
              )}
              {TABS.filter((tab) => tab.section === section).map((tab) => {
                const isActive = active === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => navigate(tab.to)}
                    title={tab.label}
                    className={`relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                      isActive
                        ? 'bg-brand-mint text-brand-dark'
                        : 'text-gray-600 hover:bg-gray-50'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    {isActive ? (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
                    ) : null}
                    {tab.icon('h-5 w-5 shrink-0')}
                    {collapsed ? null : tab.label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-gray-100 px-3 py-4">
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? 'সাইডবার খুলুন' : 'সাইডবার ভাঁজ করুন'}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <span
              className={`transition-transform ${collapsed ? '' : 'rotate-180'}`}
            >
              <IconChevronRight className="h-5 w-5" />
            </span>
            {collapsed ? null : 'ভাঁজ করুন'}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            title="লগআউট"
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-50 ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <IconLogout className="h-5 w-5 shrink-0" />
            {collapsed ? null : 'লগআউট'}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* ফোনের ওপরের হেডার */}
        <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-cream/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-2.5">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2.5"
              aria-label="ড্যাশবোর্ড"
            >
              <LogoTile size={36} />
              <span className="max-w-44 truncate text-[17px] font-extrabold">
                {shopName}
              </span>
            </button>
            <div className="flex items-center gap-2.5">
              {bellButton}
              {avatarButton}
            </div>
          </div>
        </header>

        {/* ডেস্কটপের ওপরের বার — দ্রুত কাজ + অর্ডার খোঁজা + বেল + অ্যাভাটার */}
        <header className="sticky top-0 z-40 hidden items-center gap-3 border-b border-gray-200/70 bg-cream/95 px-10 py-3 backdrop-blur lg:flex xl:px-12">
          <button
            type="button"
            onClick={() => navigate('/dashboard/products/new')}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25"
          >
            + নতুন ল্যান্ডিং পেজ
          </button>
          <form
            className="min-w-0 max-w-sm flex-1"
            onSubmit={(event) => {
              event.preventDefault()
              navigate(
                `/dashboard/orders?q=${encodeURIComponent(topQuery.trim())}`,
              )
              setTopQuery('')
            }}
          >
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={topQuery}
                onChange={(event) => setTopQuery(event.target.value)}
                placeholder="অর্ডার খুঁজুন — কোড, নাম বা ফোন"
                aria-label="অর্ডার খুঁজুন"
                className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </form>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {bellButton}
            {avatarButton}
          </div>
        </header>

        {/* ডেস্কটপে চওড়া ওয়ার্কস্পেস (সর্বোচ্চ ১৬০০px), ফোনে আগের মতো */}
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 lg:mx-0 lg:max-w-[1600px] lg:px-10 lg:pb-10 lg:pt-6 xl:px-12">
          {children}
        </main>

        {/* ফোনের নিচের ট্যাব বার */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
            {TABS.map((tab) => {
              const isActive = active === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigate(tab.to)}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
                      isActive
                        ? 'bg-brand-mint text-brand-dark'
                        : 'text-gray-500'
                    }`}
                  >
                    {tab.icon('h-5 w-5')}
                    {tab.shortLabel}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
