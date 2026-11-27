// Orderlink — Phase 1: Auth + সেটআপ উইজার্ড + ড্যাশবোর্ডের খালি কাঠামো।
// ড্যাশবোর্ড, প্রোডাক্ট ও অর্ডার আসছে Phase 2–3-এ।
import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth.tsx'
import Auth from './pages/Auth.tsx'
import SetupWizard from './pages/SetupWizard.tsx'

function DashboardPlaceholder() {
  const { user, seller, signOut } = useAuth()
  const [showWizard, setShowWizard] = useState(false)

  if (showWizard) {
    return <SetupWizard onDone={() => setShowWizard(false)} />
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <h1 className="text-3xl font-bold">
        <span className="text-brand">Order</span>
        <span className="text-accent">link</span>
      </h1>
      <p className="mt-4 text-lg text-gray-700">
        স্বাগতম{seller?.shop_name ? `, ${seller.shop_name}` : ''}!
      </p>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        লগইন করেছেন: {user?.email ?? ''}
      </p>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        ড্যাশবোর্ড, প্রোডাক্ট ও অর্ডার আসছে Phase 2–3-এ।
      </p>
      <div className="mt-6 space-x-4">
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold"
        >
          দোকানের তথ্য বদলান
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          লগআউট
        </button>
      </div>
    </main>
  )
}

function Shell() {
  const { configured, loading, user, seller } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-gray-600">লোড হচ্ছে…</p>
      </main>
    )
  }

  if (!configured) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="text-3xl font-bold">
          <span className="text-brand">Order</span>
          <span className="text-accent">link</span>
        </h1>
        <p className="mt-4 max-w-md text-gray-600">
          Supabase এখনো যুক্ত হয়নি — apps/web/.env-এ VITE_SUPABASE_URL ও
          VITE_SUPABASE_ANON_KEY বসান (দেখুন docs/setup.md)।
        </p>
      </main>
    )
  }

  if (!user) return <Auth />
  if (!seller) return <SetupWizard />
  return <DashboardPlaceholder />
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
