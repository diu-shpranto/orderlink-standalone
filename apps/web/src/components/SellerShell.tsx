// সেলার প্যানেলের শেল — হেডার (দোকানের নাম + বেল + প্রোফাইল) ও ট্যাব ন্যাভ।
// থিম সবসময় হালকা (pinned light) — ডিভাইসের ডার্ক মোড অনুসরণ করে না।
// বেলের সংখ্যা আসল নতুন অর্ডারের সংখ্যা (orders টেবিল থেকে)।
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { fetchDashboardStats } from '../lib/products.ts'
import { formatBDT, formatCountBn } from '../lib/pricing.ts'
import { navigate } from '../lib/router.ts'
import { LogoMark } from './Logo.tsx'
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

const TABS: { id: SellerTab; label: string; to: string }[] = [
  { id: 'dashboard', label: 'ড্যাশবোর্ড', to: '/dashboard' },
  { id: 'products', label: 'প্রোডাক্ট', to: '/dashboard/products' },
  { id: 'orders', label: 'অর্ডার', to: '/dashboard/orders' },
  { id: 'settings', label: 'দোকানের তথ্য', to: '/dashboard/settings' },
]

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
    return () => {
      mounted = false
    }
  }, [seller])

  const shopName = seller?.shop_name ?? 'আমার দোকান'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
            aria-label="ড্যাশবোর্ড"
          >
            <LogoMark size={32} />
            <span className="hidden text-lg font-extrabold sm:inline">
              <span className="text-brand">Order</span>
              <span className="text-accent">link</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-sm font-semibold md:inline">
              {shopName}
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((open) => !open)}
                className="relative rounded-full border border-gray-200 bg-white px-3 py-2 text-sm"
                aria-label="নোটিফিকেশন"
              >
                🔔
                {newOrders.length > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {formatCountBn(newOrders.length)}
                  </span>
                ) : null}
              </button>
              {bellOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setBellOpen(false)}
                    aria-label="বন্ধ করুন"
                  />
                  <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg">
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
                            className="border-b border-gray-100 px-4 py-3 text-sm last:border-0"
                          >
                            <p className="font-semibold">
                              {o.order_code} · {o.customer_name}
                            </p>
                            <p className="text-gray-500">
                              {formatBDT(o.total)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-bold text-white"
                aria-label="প্রোফাইল"
              >
                {shopName.charAt(0)}
              </button>
              {menuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setMenuOpen(false)}
                    aria-label="বন্ধ করুন"
                  />
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg">
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
                      className="block w-full px-4 py-3 text-left text-sm hover:bg-gray-50"
                    >
                      দোকানের তথ্য
                    </button>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="block w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-gray-50"
                    >
                      লগআউট
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(tab.to)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${
                active === tab.id
                  ? 'bg-brand text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
