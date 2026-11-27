// লগইন / সাইনআপ / পাসওয়ার্ড রিসেট — লাইভ অ্যাপের ডিজাইন অনুযায়ী:
// ক্রিম পটভূমি, বড় বোল্ড হেডলাইন, পিল টগল, গোলাকার সাদা কার্ড,
// Google বাটন, বোল্ড লেবেল, গোলাকার ইনপুট, সবুজ গ্রেডিয়েন্ট সাবমিট।
// রিসেট: ইমেইল → ৬-সংখ্যার কোড (Brevo) → কোড + নতুন পাসওয়ার্ড।
// নিয়ম (লাইভ অ্যাপের মতো): ২০ মিনিট মেয়াদ, একবার ব্যবহারযোগ্য,
// ৫ বার ভুলে ১৫ মিনিট লক, ৬০ সেকেন্ড resend কুলডাউন, পাসওয়ার্ড কমপক্ষে ৮ অক্ষর।
// সাইনআপে নাম/দোকান/হোয়াটসঅ্যাপ/ইনভাইট কোড নেওয়া হয় —
// সেটআপ উইজার্ডে এগুলো আগে থেকে বসানো থাকে (localStorage 'ol-signup-prefill')।
// ইনভাইট কোডের কোনো ব্যাকএন্ড নেই — শুধু ফরম্যাট যাচাই করা হয়।
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { navigate } from '../lib/router.ts'
import {
  anonKeyHeader,
  functionsUrl,
  supabaseConfigured,
} from '../lib/supabase.ts'
import { LogoWordmark } from '../components/Logo.tsx'
import {
  GoogleG,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconShield,
} from '../components/icons.tsx'

type Mode = 'signin' | 'signup' | 'reset-request' | 'reset-code'
type AuthLang = 'bn' | 'en'

const MIN_PASSWORD_LENGTH = 8
const RESEND_COOLDOWN_SECONDS = 60

const TEXT: Record<
  AuthLang,
  {
    headline: string
    tabSignup: string
    tabLogin: string
    google: string
    demo: string
    or: string
    email: string
    password: string
    forgot: string
    loginSubmit: string
    signupSubmit: string
    name: string
    namePh: string
    shop: string
    shopPh: string
    whatsapp: string
    whatsappPh: string
    invite: string
    invitePh: string
    emailPh: string
    passwordPh: string
    backHome: string
    secureLogin: string
    footerNote: string
    resetRequestTitle: string
    resetCodeTitle: string
    accountEmail: string
    sendCode: string
    codeLabel: string
    newPasswordLabel: string
    changePassword: string
    resend: string
    backToLogin: string
  }
> = {
  bn: {
    headline: 'Orderlink-এ আপনার দোকান খুলুন',
    tabSignup: 'অ্যাকাউন্ট খুলুন',
    tabLogin: 'লগইন',
    google: 'Google দিয়ে চালিয়ে যান',
    demo: 'ডেমো অ্যাকাউন্ট দিয়ে দেখুন',
    or: 'অথবা',
    email: 'ইমেইল',
    password: 'পাসওয়ার্ড',
    forgot: 'পাসওয়ার্ড ভুলে গেছেন?',
    loginSubmit: 'লগইন করুন',
    signupSubmit: 'অ্যাকাউন্ট খুলুন',
    name: 'আপনার নাম',
    namePh: 'যেমন: রহিম উদ্দিন',
    shop: 'দোকান / পেজের নাম',
    shopPh: 'যেমন: Dhaka Fashion House',
    whatsapp: 'হোয়াটসঅ্যাপ নম্বর',
    whatsappPh: '01XXXXXXXXXX',
    invite: 'ইনভাইট কোড (যদি থাকে)',
    invitePh: 'যেমন: OL-XXXXXX',
    emailPh: 'you@example.com',
    passwordPh: 'কমপক্ষে ৮ অক্ষর',
    backHome: 'হোমে ফিরুন',
    secureLogin: 'নিরাপদ লগইন',
    footerNote:
      'প্রতেক সেলার শুধু নিজের দোকান, প্রোডাক্ট আর অর্ডার দেখতে পায়।',
    resetRequestTitle: 'পাসওয়ার্ড রিসেট',
    resetCodeTitle: 'কোড দিয়ে পাসওয়ার্ড বদলান',
    accountEmail: 'অ্যাকাউন্টের ইমেইল',
    sendCode: 'কোড পাঠান',
    codeLabel: '৬ সংখ্যার কোড',
    newPasswordLabel: 'নতুন পাসওয়ার্ড',
    changePassword: 'পাসওয়ার্ড বদলান',
    resend: 'কোড আবার পাঠান',
    backToLogin: 'লগইনে ফিরুন',
  },
  en: {
    headline: 'Open your shop on Orderlink',
    tabSignup: 'Create account',
    tabLogin: 'Log in',
    google: 'Continue with Google',
    demo: 'Try the demo account',
    or: 'or',
    email: 'Email',
    password: 'Password',
    forgot: 'Forgot password?',
    loginSubmit: 'Log in',
    signupSubmit: 'Create account',
    name: 'Your name',
    namePh: 'e.g. Rahim Uddin',
    shop: 'Shop / Page name',
    shopPh: 'e.g. Dhaka Fashion House',
    whatsapp: 'WhatsApp number',
    whatsappPh: '01XXXXXXXXXX',
    invite: 'Invite code (if any)',
    invitePh: 'e.g. OL-XXXXXX',
    emailPh: 'you@example.com',
    passwordPh: 'At least 8 characters',
    backHome: 'Back to home',
    secureLogin: 'Secure login',
    footerNote:
      'Every seller only sees their own shop, products and orders.',
    resetRequestTitle: 'Reset password',
    resetCodeTitle: 'Change password with code',
    accountEmail: 'Account email',
    sendCode: 'Send code',
    codeLabel: '6-digit code',
    newPasswordLabel: 'New password',
    changePassword: 'Change password',
    resend: 'Resend code',
    backToLogin: 'Back to login',
  },
}

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

/** 01… / 8801… / +8801… — সবই চলে; জমা হয় 8801… আকারে। ভুল হলে null। */
function normalizeWhatsApp(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (/^8801[3-9]\d{8}$/.test(digits)) return digits
  if (/^01[3-9]\d{8}$/.test(digits)) return `880${digits.slice(1)}`
  return null
}

const inputClass =
  'w-full rounded-2xl border border-gray-300 bg-white px-3.5 py-2 text-sm placeholder:text-gray-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 sm:px-4 sm:py-3 sm:text-[15px]'
const labelClass = 'mb-1 block text-[13px] font-bold text-gray-800 sm:mb-1.5 sm:text-sm'
const submitClass =
  'w-full max-w-[280px] rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand px-4 py-3 text-base font-bold text-white shadow-lg shadow-brand/30 transition hover:opacity-95 disabled:opacity-50 sm:py-3.5 lg:max-w-none'

export default function Auth({
  initialMode = 'signin',
}: {
  initialMode?: 'signin' | 'signup'
}) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [lang, setLang] = useState<AuthLang>('bn')
  const t = TEXT[lang]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [shopName, setShopName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [invite, setInvite] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
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

  function saveSignupPrefill(wa: string) {
    try {
      localStorage.setItem(
        'ol-signup-prefill',
        JSON.stringify({
          name: name.trim(),
          shopName: shopName.trim(),
          whatsapp: wa,
        }),
      )
    } catch {
      // প্রিফিল না থাকলেও সাইনআপ চলবে — উইজার্ডে হাতে লিখতে হবে।
    }
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
        if (!name.trim()) {
          setError('আপনার নাম দিন।')
          setBusy(false)
          return
        }
        if (!shopName.trim()) {
          setError('দোকান / পেজের নাম দিন।')
          setBusy(false)
          return
        }
        const wa = normalizeWhatsApp(whatsapp)
        if (!wa) {
          setError('সঠিক হোয়াটসঅ্যাপ নম্বর দিন (01XXXXXXXXXX)।')
          setBusy(false)
          return
        }
        if (
          invite.trim() &&
          !/^OL-[A-Za-z0-9]{6}$/.test(invite.trim())
        ) {
          setError('ইনভাইট কোডের ফরম্যাট সঠিক নয় (যেমন: OL-XXXXXX)।')
          setBusy(false)
          return
        }
        const { needsConfirmation } = await signUp(email.trim(), password)
        saveSignupPrefill(wa)
        if (needsConfirmation) {
          setNotice(
            'অ্যাকাউন্ট তৈরি হয়েছে — ইমেইল চেক করে নিশ্চিত করুন, তারপর লগইন করুন।',
          )
          setMode('signin')
        } else {
          // সেশন তৈরি হয়ে গেছে — AuthRoute-এর effect-এর অপেক্ষা না করে
          // এখনই ড্যাশবোর্ডে যান (সেখানে SellerGate উইজার্ড/ড্যাশবোর্ড ঠিক করবে)।
          navigate('/dashboard')
        }
      } else {
        await signIn(email.trim(), password)
        navigate('/dashboard')
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

  async function handleDemoLogin() {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await signIn('demo@orderlink.demo', 'demo1234')
      navigate('/dashboard')
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ''))
    } finally {
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
      <main className="flex min-h-screen items-center justify-center bg-cream px-6">
        <p className="max-w-md text-center text-gray-600">
          Supabase এখনো যুক্ত হয়নি — apps/web/.env-এ VITE_SUPABASE_URL ও
          VITE_SUPABASE_ANON_KEY বসান (দেখুন docs/setup.md)।
        </p>
      </main>
    )
  }

  const isAuthMode = mode === 'signin' || mode === 'signup'
  const headline =
    mode === 'reset-request'
      ? t.resetRequestTitle
      : mode === 'reset-code'
        ? t.resetCodeTitle
        : t.headline

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl lg:items-stretch lg:gap-10 lg:px-6 lg:py-10">
        {/* ব্র্যান্ড প্যানেল — শুধু ডেস্কটপে */}
        <aside className="hidden w-[400px] shrink-0 flex-col justify-between rounded-[32px] bg-gradient-to-br from-brand-deep via-brand-dark to-brand p-8 text-white shadow-xl lg:flex">
          <div>
            <div className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-md">
              <LogoWordmark size={30} />
            </div>
            <h2 className="mt-8 text-[28px] font-extrabold leading-snug">
              ফেসবুক পোস্টে লিংক দিন, অর্ডার আসবে সাজানো ফর্মে
            </h2>
            <ul className="mt-6 space-y-3 text-[15px] font-medium text-white/90">
              {[
                'কোডিং ছাড়াই প্রোডাক্টের ল্যান্ডিং পেজ',
                'প্রতিটা অর্ডার অটোমেটিক আপনার Google Sheet-এ',
                'ঢাকার ভেতরে ও বাইরে আলাদা ডেলিভারি চার্জ',
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-white/60">© 2026 Orderlink</p>
        </aside>

        {/* ফর্ম কলাম */}
        <div className="flex w-full flex-1 flex-col px-4 py-3 sm:px-8 sm:py-6 lg:justify-center lg:py-0">
          <div className="mx-auto w-full max-w-md">
            {/* লগইন / রিসেট: ফিরুন লিংক + ভাষা টগল */}
            {mode !== 'signup' ? (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-sm font-bold text-brand-dark"
                >
                  ← {t.backHome}
                </button>
                <div
                  className="inline-flex items-center rounded-full border border-gray-300 bg-white p-0.5 text-sm font-bold"
                  role="group"
                  aria-label="ভাষা"
                >
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`rounded-full px-3 py-1.5 ${
                      lang === 'en' ? 'bg-brand text-white shadow' : 'text-gray-600'
                    }`}
                  >
                    EN
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setLang('bn')}
                    className={`rounded-full px-3 py-1.5 ${
                      lang === 'bn' ? 'bg-brand text-white shadow' : 'text-gray-600'
                    }`}
                  >
                    বাংলা
                  </button>
                </div>
              </div>
            ) : null}

            {/* লগইন: লোগো টাইল + নিরাপদ লগইন ব্যাজ */}
            {mode === 'signin' ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-6 lg:mt-8">
                <div className="inline-flex rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm sm:px-4 sm:py-3">
                  <LogoWordmark size={30} />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-bold text-gray-700 shadow-sm">
                  <IconShield className="h-4 w-4 text-brand" />
                  {t.secureLogin}
                </span>
              </div>
            ) : null}

            <h1
              className={`text-[22px] font-extrabold leading-tight text-gray-900 sm:text-3xl ${
                mode === 'signin' ? 'mt-4 sm:mt-6' : 'mt-2'
              }`}
            >
              {headline}
            </h1>

            {/* সাইনআপ / লগইন পিল টগল */}
            {isAuthMode ? (
              <div className="mt-3 inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm sm:mt-5">
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold transition sm:px-5 sm:py-2.5 ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-brand-dark to-brand text-white shadow'
                      : 'text-gray-600'
                  }`}
                >
                  {t.tabSignup}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold transition sm:px-5 sm:py-2.5 ${
                    mode === 'signin'
                      ? 'bg-gradient-to-r from-brand-dark to-brand text-white shadow'
                      : 'text-gray-600'
                  }`}
                >
                  {t.tabLogin}
                </button>
              </div>
            ) : null}

            {notice ? (
              <p className="mt-3 rounded-2xl bg-brand-light px-4 py-3 text-sm font-medium text-brand-dark sm:mt-5">
                {notice}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:mt-5">
                {error}
              </p>
            ) : null}

            {/* সাদা কার্ড */}
            <div className="mt-3 rounded-[28px] border border-gray-200 bg-white px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:mt-5 sm:p-6">
              {isAuthMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleGoogle()}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50 sm:py-3.5 sm:text-[15px]"
                  >
                    <GoogleG className="h-5 w-5" />
                    {t.google}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDemoLogin()}
                    disabled={busy}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-light px-4 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-brand-light/70 disabled:opacity-50 sm:mt-3 sm:py-3.5 sm:text-[15px]"
                  >
                    {t.demo}
                  </button>

                  <div className="my-3 flex items-center gap-3 text-sm text-gray-400 sm:my-5">
                    <span className="h-px flex-1 bg-gray-200" />
                    {t.or}
                    <span className="h-px flex-1 bg-gray-200" />
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-2 sm:space-y-4">
                    {mode === 'signup' ? (
                      <>
                        <label className="block">
                          <span className={labelClass}>{t.name}</span>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputClass}
                            placeholder={t.namePh}
                          />
                        </label>
                        <label className="block">
                          <span className={labelClass}>{t.shop}</span>
                          <input
                            type="text"
                            required
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            className={inputClass}
                            placeholder={t.shopPh}
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                          <label className="block">
                            <span className={labelClass}>{t.whatsapp}</span>
                            <input
                              type="tel"
                              required
                              value={whatsapp}
                              onChange={(e) => setWhatsapp(e.target.value)}
                              className={inputClass}
                              placeholder={t.whatsappPh}
                            />
                          </label>
                          <label className="block">
                            <span className={labelClass}>{t.invite}</span>
                            <input
                              type="text"
                              value={invite}
                              onChange={(e) => setInvite(e.target.value)}
                              className={inputClass}
                              placeholder={t.invitePh}
                            />
                          </label>
                        </div>
                      </>
                    ) : null}
                    <label className="block">
                      <span className={labelClass}>{t.email}</span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                        placeholder={t.emailPh}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>{t.password}</span>
                      <span className="relative block">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={MIN_PASSWORD_LENGTH}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputClass} pr-12`}
                          placeholder={t.passwordPh}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          aria-label={
                            showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান'
                          }
                        >
                          {showPassword ? (
                            <IconEyeOff className="h-5 w-5" />
                          ) : (
                            <IconEye className="h-5 w-5" />
                          )}
                        </button>
                      </span>
                    </label>
                    {mode === 'signin' ? (
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => switchMode('reset-request')}
                          className="text-sm font-bold text-brand-dark underline decoration-dotted underline-offset-4"
                        >
                          {t.forgot}
                        </button>
                      </div>
                    ) : null}
                    <div className="flex justify-center">
                      <button
                        type="submit"
                        disabled={busy}
                        className={submitClass}
                      >
                        {busy
                          ? 'অপেক্ষা করুন…'
                          : mode === 'signup'
                            ? t.signupSubmit
                            : t.loginSubmit}
                      </button>
                    </div>
                  </form>
                </>
              ) : null}

              {mode === 'reset-request' ? (
                <form onSubmit={handleResetRequest} className="space-y-2 sm:space-y-4">
                  <label className="block">
                    <span className={labelClass}>{t.accountEmail}</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder={t.emailPh}
                    />
                  </label>
                  <div className="flex justify-center">
                    <button type="submit" disabled={busy} className={submitClass}>
                      {busy ? 'পাঠানো হচ্ছে…' : t.sendCode}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="w-full text-sm font-bold text-brand-dark"
                  >
                    {t.backToLogin}
                  </button>
                </form>
              ) : null}

              {mode === 'reset-code' ? (
                <form onSubmit={handleResetVerify} className="space-y-2 sm:space-y-4">
                  <p className="text-sm text-gray-600">
                    {email} ঠিকানায় ৬ সংখ্যার কোড পাঠানো হয়েছে।
                  </p>
                  <label className="block">
                    <span className={labelClass}>{t.codeLabel}</span>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, ''))
                      }
                      className={`${inputClass} tracking-[0.5em]`}
                      placeholder="••••••"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>{t.newPasswordLabel}</span>
                    <span className="relative block">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={MIN_PASSWORD_LENGTH}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`${inputClass} pr-12`}
                        placeholder={t.passwordPh}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        aria-label={
                          showNewPassword
                            ? 'পাসওয়ার্ড লুকান'
                            : 'পাসওয়ার্ড দেখান'
                        }
                      >
                        {showNewPassword ? (
                          <IconEyeOff className="h-5 w-5" />
                        ) : (
                          <IconEye className="h-5 w-5" />
                        )}
                      </button>
                    </span>
                  </label>
                  <div className="flex justify-center">
                    <button type="submit" disabled={busy} className={submitClass}>
                      {busy ? 'যাচাই হচ্ছে…' : t.changePassword}
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={busy || cooldown > 0}
                    onClick={() => void requestCode()}
                    className="w-full text-sm font-bold text-brand-dark disabled:opacity-50"
                  >
                    {cooldown > 0
                      ? `আবার পাঠানো যাবে ${cooldown} সেকেন্ড পরে`
                      : t.resend}
                  </button>
                </form>
              ) : null}
            </div>

            {mode === 'signin' ? (
              <p className="mt-3 text-center text-sm text-gray-500 sm:mt-5">
                {t.footerNote}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
