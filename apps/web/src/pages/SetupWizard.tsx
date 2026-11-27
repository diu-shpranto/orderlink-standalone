// প্রথমবারের সেটআপ উইজার্ড — দোকানের তথ্য, দোকানের লিংক (slug),
// ডেলিভারি চার্জ। সাইনআপের পর প্রথম লগইনে দেখায়।
// WhatsApp 8801XXXXXXXXX আকারে জমা হয় (01… / 8801… / +8801… সব চলে)।
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { requireSupabase } from '../lib/supabase.ts'

function slugifyShopName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function normalizeWhatsapp(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.startsWith('8801')) return digits.slice(0, 13)
  if (digits.startsWith('01')) return `880${digits.slice(1)}`.slice(0, 13)
  if (digits.startsWith('1')) return `880${digits}`.slice(0, 13)
  return digits
}

export default function SetupWizard({
  onDone,
}: {
  onDone?: () => void
}) {
  const { user, refreshSeller, signOut } = useAuth()
  const [step, setStep] = useState(1)
  const [shopName, setShopName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [insideCharge, setInsideCharge] = useState('60')
  const [outsideCharge, setOutsideCharge] = useState('120')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function handleShopNameChange(value: string) {
    setShopName(value)
    if (!slugTouched) setSlug(slugifyShopName(value))
  }

  function handleNextFromStep1(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!shopName.trim() || !ownerName.trim() || !whatsapp.trim()) {
      setError('দোকানের নাম, আপনার নাম ও WhatsApp নম্বর — তিনটাই লাগবে।')
      return
    }
    setStep(2)
  }

  function handleNextFromStep2(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      setError(
        'লিংকের নামে শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও হাইফেন (-) চলবে।',
      )
      return
    }
    setStep(3)
  }

  async function handleFinish(event: FormEvent) {
    event.preventDefault()
    setError('')
    const inside = Number(insideCharge)
    const outside = Number(outsideCharge)
    if (
      !Number.isFinite(inside) ||
      inside < 0 ||
      !Number.isFinite(outside) ||
      outside < 0
    ) {
      setError('ডেলিভারি চার্জে সঠিক সংখ্যা দিন (০ বা তার বেশি)।')
      return
    }
    if (!user) {
      setError('লগইন অবস্থা পাওয়া যায়নি — আবার লগইন করুন।')
      return
    }
    setBusy(true)
    try {
      const client = requireSupabase()
      const normalizedWhatsapp = normalizeWhatsapp(whatsapp)
      const { error: sellerError } = await client.from('sellers').upsert({
        id: user.id,
        email: user.email ?? '',
        owner_name: ownerName.trim(),
        shop_name: shopName.trim(),
        whatsapp: normalizedWhatsapp,
      })
      if (sellerError) throw sellerError

      // দোকান আগেই থাকলে আপডেট, না থাকলে নতুন (উইজার্ড আবার চালালে ডুপ্লিকেট হবে না)।
      const { data: existingShop } = await client
        .from('shops')
        .select('id')
        .eq('seller_id', user.id)
        .maybeSingle()
      if (existingShop) {
        const { error: shopError } = await client
          .from('shops')
          .update({
            slug: slug.trim(),
            name: shopName.trim(),
            delivery_inside_charge: inside,
            delivery_outside_charge: outside,
          })
          .eq('id', (existingShop as { id: string }).id)
        if (shopError) throw shopError
      } else {
        const { error: shopError } = await client.from('shops').insert({
          seller_id: user.id,
          slug: slug.trim(),
          name: shopName.trim(),
          delivery_inside_charge: inside,
          delivery_outside_charge: outside,
        })
        if (shopError) {
          if (shopError.code === '23505') {
            throw new Error(
              'এই লিংকের নামটা আগেই নেওয়া হয়েছে — অন্য নাম দিন।',
            )
          }
          throw shopError
        }
      }
      await refreshSeller()
      if (onDone) onDone()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'সেটআপ শেষ করা যায়নি — আবার চেষ্টা করুন।',
      )
    } finally {
      setBusy(false)
    }
  }

  const inputClass = 'mt-1 w-full rounded border border-gray-300 px-3 py-2'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <h1 className="text-3xl font-bold">
        <span className="text-brand">Order</span>
        <span className="text-accent">link</span>
      </h1>
      <h2 className="mt-6 text-xl font-semibold">আপনার দোকান সেটআপ করুন</h2>
      <p className="mt-2 text-sm text-gray-600">ধাপ {step} / ৩</p>

      {error ? (
        <p className="mt-4 w-full max-w-sm rounded bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {step === 1 && (
        <form
          onSubmit={handleNextFromStep1}
          className="mt-6 w-full max-w-sm space-y-4"
        >
          <label className="block">
            <span className="text-sm text-gray-700">দোকানের নাম</span>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => handleShopNameChange(e.target.value)}
              className={inputClass}
              placeholder="যেমন: ShopiQue Prime Store"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">আপনার নাম</span>
            <input
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className={inputClass}
              placeholder="দোকানের মালিকের নাম"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">WhatsApp নম্বর</span>
            <input
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={inputClass}
              placeholder="01XXXXXXXXX"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded bg-brand px-4 py-2 font-semibold text-white"
          >
            পরের ধাপ →
          </button>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={handleNextFromStep2}
          className="mt-6 w-full max-w-sm space-y-4"
        >
          <label className="block">
            <span className="text-sm text-gray-700">
              দোকানের লিংকের নাম (shop slug)
            </span>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              }}
              className={inputClass}
              placeholder="amar-dokan"
            />
          </label>
          <p className="text-sm text-gray-600">
            আপনার পেজের ঠিকানা হবে: /{slug || 'amar-dokan'}/প্রোডাক্ট
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded border border-gray-300 px-4 py-2 font-semibold"
            >
              ← আগের ধাপ
            </button>
            <button
              type="submit"
              className="flex-1 rounded bg-brand px-4 py-2 font-semibold text-white"
            >
              পরের ধাপ →
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form
          onSubmit={handleFinish}
          className="mt-6 w-full max-w-sm space-y-4"
        >
          <label className="block">
            <span className="text-sm text-gray-700">
              ঢাকার ভেতরে ডেলিভারি চার্জ (৳)
            </span>
            <input
              type="number"
              required
              min={0}
              value={insideCharge}
              onChange={(e) => setInsideCharge(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">
              ঢাকার বাইরে ডেলিভারি চার্জ (৳)
            </span>
            <input
              type="number"
              required
              min={0}
              value={outsideCharge}
              onChange={(e) => setOutsideCharge(e.target.value)}
              className={inputClass}
            />
          </label>
          <p className="text-sm text-gray-600">
            পরে Settings থেকে চার্জ বদলানো যাবে। Google Sheet সংযোগ পরে
            Settings → Google Sheets থেকে করা যাবে।
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded border border-gray-300 px-4 py-2 font-semibold"
            >
              ← আগের ধাপ
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'সেভ হচ্ছে…' : 'সেটআপ শেষ করুন'}
            </button>
          </div>
        </form>
      )}

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-6 text-sm text-gray-500 underline"
      >
        লগআউট
      </button>
    </main>
  )
}
