// Supabase Auth — ইমেইল/পাসওয়ার্ড + Google লগইন।
// সেশন বদলালেই sellers সারি (মালিকের অ্যাকাউন্ট) আবার পড়া হয়।
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { requireSupabase, supabaseConfigured } from './supabase.ts'

export interface SellerRow {
  id: string
  email: string
  owner_name: string | null
  shop_name: string | null
  whatsapp: string | null
}

interface AuthContextValue {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  seller: SellerRow | null
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshSeller: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [seller, setSeller] = useState<SellerRow | null>(null)

  const user = session?.user ?? null

  async function loadSeller(userId: string) {
    const client = requireSupabase()
    const { data } = await client
      .from('sellers')
      .select('id, email, owner_name, shop_name, whatsapp')
      .eq('id', userId)
      .maybeSingle()
    setSeller((data as SellerRow | null) ?? null)
  }

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }
    const client = requireSupabase()
    let mounted = true
    client.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        void loadSeller(data.session.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })
    const { data: listener } = client.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession)
        if (nextSession?.user) {
          void loadSeller(nextSession.user.id)
        } else {
          setSeller(null)
        }
      },
    )
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signUp(email: string, password: string) {
    const client = requireSupabase()
    const { data, error } = await client.auth.signUp({ email, password })
    if (error) throw error
    // Supabase-এ "Confirm email" চালু থাকলে সেশন আসে না — তখন
    // ব্যবহারকারীকে ইনবক্স চেক করতে বলতে হয়। বন্ধ থাকলে সরাসরি সাইন ইন।
    return { needsConfirmation: !data.session }
  }

  async function signIn(email: string, password: string) {
    const client = requireSupabase()
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    setSession(data.session)
  }

  async function signInWithGoogle() {
    const client = requireSupabase()
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    const client = requireSupabase()
    const { error } = await client.auth.signOut()
    if (error) throw error
    setSession(null)
    setSeller(null)
  }

  async function refreshSeller() {
    if (user) await loadSeller(user.id)
  }

  const value: AuthContextValue = {
    configured: supabaseConfigured,
    loading,
    session,
    user,
    seller,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshSeller,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth শুধু AuthProvider-এর ভেতরে ব্যবহার করা যাবে।')
  }
  return ctx
}
