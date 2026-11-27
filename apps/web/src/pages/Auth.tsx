// লগইন / সাইনআপ / পাসওয়ার্ড রিসেট — বাংলা UI।
// রিসেট: ইমেইল → ৬-সংখ্যার কোড (Brevo) → কোড + নতুন পাসওয়ার্ড।
// নিয়ম (লাইভ অ্যাপের মতো): ২০ মিনিট মেয়াদ, একবার ব্যবহারযোগ্য,
// ৫ বার ভুলে ১৫ মিনিট লক, ৬০ সেকেন্ড resend কুলডাউন, পাসওয়ার্ড কমপক্ষে ৮ অক্ষর।
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/auth.tsx'
import {
  anonKeyHeader,
  functionsUrl,
  supabaseConfigured,
} from '../lib/supabase.ts'

type Mode = 'signin' | 'signup' | 'reset-request' | 'reset-code'

const MIN_PASSWORD_LENGTH = 8
const RESEND_COOLDOWN_SECONDS = 60

function friendlyError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'ইমেইল বা পাসওয়ার্ড ভুল।'
  }
  if (message.includes('User already registered')) {
    return 'এই ইমেইলে অ্যাকাউন্ট আগেই আছে — লগইন করুন।'
  }
  if (message.includes('Password should be at least')) {
    return 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'
  }
  if (message.includes('Email rate limit exceeded')) {
    return 'অনেকবার চেষ্টা করা হয়েছে — কিছুক্ষণ পরে আবার চেষ্টা করুন।'
  }
  return message || 'কিছু একটা ভুল হয়েছে — আবার চেষ্টা করুন।'
}

export default function Auth({
  initialMode = 'signin',
}: {
  initialMode?: 'signin' | 'signup'
}) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const cooldownTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (cooldownTimer.current !== null) {
        window.clearInterval(cooldownTimer.current)
      }
    }
  }, [])

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS)
    if (cooldownTimer.current !== null) {
      window.clearInterval(cooldownTimer.current)
    }
    cooldownTimer.current = window.setInterval(() => {
      setCooldown((left) => {
        if (left <= 1) {
          if (cooldownTimer.current !== null) {
            window.clearInterval(cooldownTimer.current)
            cooldownTimer.current = null
          }
          return 0
        }
        return left - 1
      })
    }, 1000)
  }

  async function handleAuthSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email.trim(), password)
        if (needsConfirmation) {
          setNotice(
            'অ্যাকাউন্ট তৈরি হয়েছে — ইমেইল চেক করে নিশ্চিত করুন, তারপর লগইন করুন।',
          )
          setMode('signin')
        }
      } else {
        await signIn(email.trim(), password)
      }
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ''))
    } finally {
      setBusy(false)
    }
  }

  async function requestCode() {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const res = await fetch(functionsUrl('send-reset-code'), {
        method: 'POST',
        headers: anonKeyHeader(),
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'কোড পাঠানো যায়নি।')
      }
      // নিবন্ধিত না হলেও একই বার্তা — ইমেইল আছে কি নেই বোঝা যাবে না।
      setNotice(
        'কোড পাঠানো হয়েছে — আপনার ইনবক্স চেক করুন (২০ মিনিটের মধ্যে ব্যবহার করুন)।',
      )
      setMode('reset-code')
      startCooldown()
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ''))
    } finally {
      setBusy(false)
    }
  }

  async function handleResetRequest(event: FormEvent) {
    event.preventDefault()
    await requestCode()
  }

  async function handleResetVerify(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!/^\d{6}$/.test(code.trim())) {
      setError('৬ সংখ্যার কোড দিন।')
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError('নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(functionsUrl('verify-reset-code'), {
        method: 'POST',
        headers: anonKeyHeader(),
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'কোড যাচাই করা যায়নি।')
      }
      setNotice('পাসওয়ার্ড বদলে গেছে — নতুন পাসওয়ার্ড দিয়ে লগইন করুন।')
      setMode('signin')
      setPassword('')
      setCode('')
      setNewPassword('')
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ''))
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ''))
      setBusy(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setNotice('')
  }

  if (!supabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="max-w-md text-center text-gray-600">
          Supabase এখনো যুক্ত হয়নি — apps/web/.env-এ VITE_SUPABASE_URL ও
          VITE_SUPABASE_ANON_KEY বসান (দেখুন docs/setup.md)।
        </p>
      </main>
    )
  }

  const title =
    mode === 'signup'
      ? 'অ্যাকাউন্ট খুলুন'
      : mode === 'reset-request'
        ? 'পাসওয়ার্ড রিসেট'
        : mode === 'reset-code'
          ? 'কোড দিয়ে পাসওয়ার্ড বদলান'
          : 'লগইন করুন'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <h1 className="text-3xl font-bold">
        <span className="text-brand">Order</span>
        <span className="text-accent">link</span>
      </h1>
      <h2 className="mt-6 text-xl font-semibold">{title}</h2>

      {notice ? (
        <p className="mt-4 w-full max-w-sm rounded bg-brand-light px-4 py-3 text-sm text-brand-dark">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 w-full max-w-sm rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {(mode === 'signin' || mode === 'signup') && (
        <form
          onSubmit={handleAuthSubmit}
          className="mt-6 w-full max-w-sm space-y-4"
        >
          <label className="block">
            <span className="text-sm text-gray-700">ইমেইল</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">পাসওয়ার্ড</span>
            <input
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              placeholder="কমপক্ষে ৮ অক্ষর"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? 'অপেক্ষা করুন…'
              : mode === 'signup'
                ? 'অ্যাকাউন্ট খুলুন'
                : 'লগইন করুন'}
          </button>
        </form>
      )}

      {mode === 'reset-request' && (
        <form
          onSubmit={handleResetRequest}
          className="mt-6 w-full max-w-sm space-y-4"
        >
          <label className="block">
            <span className="text-sm text-gray-700">অ্যাকাউন্টের ইমেইল</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              placeholder="you@example.com"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'পাঠানো হচ্ছে…' : 'কোড পাঠান'}
          </button>
        </form>
      )}

      {mode === 'reset-code' && (
        <form
          onSubmit={handleResetVerify}
          className="mt-6 w-full max-w-sm space-y-4"
        >
          <p className="text-sm text-gray-600">
            {email} ঠিকানায় ৬ সংখ্যার কোড পাঠানো হয়েছে।
          </p>
          <label className="block">
            <span className="text-sm text-gray-700">৬ সংখ্যার কোড</span>
            <input
              type="text"
              required
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 tracking-[0.5em]"
              placeholder="••••••"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">নতুন পাসওয়ার্ড</span>
            <input
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              placeholder="কমপক্ষে ৮ অক্ষর"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'যাচাই হচ্ছে…' : 'পাসওয়ার্ড বদলান'}
          </button>
          <button
            type="button"
            disabled={busy || cooldown > 0}
            onClick={() => void requestCode()}
            className="w-full text-sm text-brand-dark underline disabled:opacity-50"
          >
            {cooldown > 0
              ? `আবার পাঠানো যাবে ${cooldown} সেকেন্ড পরে`
              : 'কোড আবার পাঠান'}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={busy}
        className="mt-4 w-full max-w-sm rounded border border-gray-300 px-4 py-2 font-semibold disabled:opacity-50"
      >
        Google দিয়ে চালিয়ে যান
      </button>

      <div className="mt-6 space-x-4 text-sm">
        {mode !== 'signin' && (
          <button
            type="button"
            className="text-brand-dark underline"
            onClick={() => switchMode('signin')}
          >
            লগইনে ফিরুন
          </button>
        )}
        {mode === 'signin' && (
          <>
            <button
              type="button"
              className="text-brand-dark underline"
              onClick={() => switchMode('signup')}
            >
              নতুন অ্যাকাউন্ট খুলুন
            </button>
            <button
              type="button"
              className="text-brand-dark underline"
              onClick={() => switchMode('reset-request')}
            >
              পাসওয়ার্ড ভুলে গেছেন?
            </button>
          </>
        )}
      </div>
    </main>
  )
}
