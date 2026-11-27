// Orderlink — Phase 2: রাউটারসহ অ্যাপ শেল।
// পাবলিক রুট: হোম, তথ্য পেজ, /<shop>/<product> কাস্টমার পেজ,
// পুরনো /p/<slug> (নতুন ঠিকানায় রিডাইরেক্ট)।
// সেলার রুট (/dashboard...): লগইন + সেটআপ উইজার্ডের পর খোলে।
import { useEffect, useState } from 'react'
import CustomerPage from './components/CustomerPage.tsx'
import { AuthProvider, useAuth } from './lib/auth.tsx'
import { fetchCustomerPage, fetchPageBySlug } from './lib/products.ts'
import { navigate, pathSegments, usePath } from './lib/router.ts'
import type { CustomerPageData } from './lib/types.ts'
import Auth from './pages/Auth.tsx'
import { DashboardOverview, SettingsPage } from './pages/Dashboard.tsx'
import Home from './pages/Home.tsx'
import {
  AboutPage,
  ContactPage,
  HelpPage,
  PrivacyPage,
  TermsPage,
} from './pages/InfoPages.tsx'
import Products from './pages/Products.tsx'
import ProductBuilder from './pages/ProductBuilder.tsx'
import Orders from './pages/Orders.tsx'
import SetupWizard from './pages/SetupWizard.tsx'

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      {children}
    </main>
  )
}

function NotFound({ message }: { message: string }) {
  return (
    <Centered>
      <h1 className="text-2xl font-bold">
        <span className="text-brand">Order</span>
        <span className="text-accent">link</span>
      </h1>
      <p className="mt-4 text-gray-600">{message}</p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-6 rounded bg-brand px-4 py-2 text-sm font-semibold text-white"
      >
        হোমে ফিরুন
      </button>
    </Centered>
  )
}

function CustomerPageRoute({
  shopSlug,
  productSlug,
}: {
  shopSlug: string
  productSlug: string
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CustomerPageData | null>(null)
  const [unpublished, setUnpublished] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    setUnpublished(false)
    fetchCustomerPage(shopSlug, productSlug)
      .then((result) => {
        if (!mounted) return
        if (!result) {
          setData(null)
        } else if (!result.page.is_published) {
          setUnpublished(true)
          setData(null)
        } else {
          setData(result)
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'লোড করা যায়নি।')
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [shopSlug, productSlug])

  if (loading) {
    return (
      <Centered>
        <p className="text-gray-600">লোড হচ্ছে…</p>
      </Centered>
    )
  }
  if (unpublished) {
    return <NotFound message="এই পেজটি এখনো প্রকাশ করা হয়নি।" />
  }
  if (error) {
    return <NotFound message={error} />
  }
  if (!data) {
    return <NotFound message="এই ঠিকানায় কোনো পেজ পাওয়া যায়নি।" />
  }
  return <CustomerPage data={data} />
}

// পুরনো /p/<slug> লিংক → নতুন /<shop>/<product> ঠিকানা।
function LegacyProductRedirect({ slug }: { slug: string }) {
  useEffect(() => {
    let mounted = true
    fetchPageBySlug(slug)
      .then((target) => {
        if (!mounted) return
        if (target) {
          navigate(`/${target.shopSlug}/${target.productSlug}`)
        } else {
          navigate('/')
        }
      })
      .catch(() => {
        if (mounted) navigate('/')
      })
    return () => {
      mounted = false
    }
  }, [slug])
  return (
    <Centered>
      <p className="text-gray-600">লোড হচ্ছে…</p>
    </Centered>
  )
}

function AuthRoute({ mode }: { mode: 'signin' | 'signup' }) {
  const { loading, user, seller } = useAuth()
  useEffect(() => {
    if (!loading && user && seller) navigate('/dashboard')
  }, [loading, user, seller])
  if (loading || (user && seller)) {
    return (
      <Centered>
        <p className="text-gray-600">লোড হচ্ছে…</p>
      </Centered>
    )
  }
  return <Auth initialMode={mode} />
}

function SellerGate({ children }: { children: React.ReactNode }) {
  const { configured, loading, user, seller } = useAuth()
  if (loading) {
    return (
      <Centered>
        <p className="text-gray-600">লোড হচ্ছে…</p>
      </Centered>
    )
  }
  if (!configured) {
    return (
      <Centered>
        <h1 className="text-3xl font-bold">
          <span className="text-brand">Order</span>
          <span className="text-accent">link</span>
        </h1>
        <p className="mt-4 max-w-md text-gray-600">
          Supabase এখনো যুক্ত হয়নি — apps/web/.env-এ VITE_SUPABASE_URL ও
          VITE_SUPABASE_ANON_KEY বসান (দেখুন docs/setup.md)।
        </p>
      </Centered>
    )
  }
  if (!user) return <Auth />
  if (!seller) return <SetupWizard />
  return <>{children}</>
}

function Shell() {
  const path = usePath()
  const segments = pathSegments(path)

  if (segments.length === 0) return <Home />
  if (segments[0] === 'login') return <AuthRoute mode="signin" />
  if (segments[0] === 'signup') return <AuthRoute mode="signup" />
  if (segments[0] === 'about') return <AboutPage />
  if (segments[0] === 'contact') return <ContactPage />
  if (segments[0] === 'privacy') return <PrivacyPage />
  if (segments[0] === 'terms') return <TermsPage />
  if (segments[0] === 'help') return <HelpPage />

  if (segments[0] === 'p' && segments[1]) {
    return <LegacyProductRedirect slug={segments[1]} />
  }

  if (segments[0] === 'dashboard') {
    if (segments.length === 1) {
      return (
        <SellerGate>
          <DashboardOverview />
        </SellerGate>
      )
    }
    if (segments[1] === 'products') {
      if (segments.length === 2) {
        return (
          <SellerGate>
            <Products />
          </SellerGate>
        )
      }
      if (segments[2] === 'new') {
        return (
          <SellerGate>
            <ProductBuilder />
          </SellerGate>
        )
      }
      return (
        <SellerGate>
          <ProductBuilder productId={segments[2]} />
        </SellerGate>
      )
    }
    if (segments[1] === 'orders') {
      return (
        <SellerGate>
          <Orders />
        </SellerGate>
      )
    }
    if (segments[1] === 'settings') {
      return (
        <SellerGate>
          <SettingsPage />
        </SellerGate>
      )
    }
    return <NotFound message="এই ঠিকানায় কোনো পেজ পাওয়া যায়নি।" />
  }

  if (segments.length === 2) {
    return (
      <CustomerPageRoute shopSlug={segments[0]} productSlug={segments[1]} />
    )
  }

  return <NotFound message="এই ঠিকানায় কোনো পেজ পাওয়া যায়নি।" />
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
