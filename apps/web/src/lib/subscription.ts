// সাবস্ক্রিপশন — প্যাকেজের ক্যাটালগ, বর্তমান প্ল্যান, পেমেন্ট আর ব্যবহার।
// দাম ও সীমা সবসময় সার্ভারের ক্যাটালগ (subscription_plans) থেকে আসে —
// UI-তে কোনো দাম হার্ডকোড করা নেই। ফ্রি প্ল্যানের স্টোরেজ গার্ড
// (১০০ MB) শুধু কোডের ভেতরে — UI-তে কখনো "ফ্রি প্ল্যানে ১০০ MB"
// বলে দেখানো যাবে না।
import { requireSupabase, supabase, functionsUrl } from './supabase.ts'
import { anonKeyHeader } from './supabase.ts'

export interface PlanRow {
  id: string
  name: string
  price_bdt: number
  max_pages: number
  storage_mb: number
  is_recommended: boolean
  features_bn: string[]
  sort_order: number
  is_active: boolean
}

export interface SubscriptionRow {
  id: string
  seller_id: string
  plan_id: string
  starts_at: string
  ends_at: string
  status: 'active' | 'grace' | 'expired'
}

export type PaymentMethod = 'bkash' | 'nagad' | 'upay'

export const PAYMENT_METHODS: PaymentMethod[] = ['bkash', 'nagad', 'upay']

export const METHOD_BN: Record<PaymentMethod, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  upay: 'Upay',
}

export const METHOD_SETTING_KEY: Record<PaymentMethod, string> = {
  bkash: 'payment_bkash_number',
  nagad: 'payment_nagad_number',
  upay: 'payment_upay_number',
}

export interface PaymentRow {
  id: string
  seller_id: string
  plan_id: string
  method: PaymentMethod
  trxid: string
  amount_bdt: number
  sender_number: string
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null
  receipt_code: string | null
  created_at: string
}

export interface UsageRow {
  seller_id: string
  active_pages: number
  storage_bytes: number
}

// ফ্রি প্ল্যান: সর্বোচ্চ ১টি সক্রিয় পেজ। স্টোরেজ গার্ড (MB) —
// শুধু কোডের ভেতরে, UI-তে এই সংখ্যা দেখানো যাবে না।
export const FREE_PAGE_LIMIT = 1
export const FREE_STORAGE_MB = 100

export function storageMbLabel(mb: number): string {
  return mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`
}

// প্যাকেজের ক্যাটালগ — সার্ভার থেকে (হোমের প্রাইসিংও এটাই দেখায়)।
export async function fetchPlans(): Promise<PlanRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as PlanRow[]
}

// অ্যাডমিনের সেটিংস — পেমেন্টের নম্বর + গ্রেসের দিন।
export async function fetchPlatformSettings(): Promise<Record<string, string>> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('platform_settings')
    .select('key, value')
  if (error) throw error
  const out: Record<string, string> = {}
  for (const row of (data ?? []) as { key: string; value: string }[]) {
    out[row.key] = row.value ?? ''
  }
  return out
}

export function graceDaysFromSettings(
  settings: Record<string, string>,
): number {
  const raw = (settings.grace_days ?? '').trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3
}

export type SubscriptionState =
  | 'free'
  | 'active'
  | 'expiring'
  | 'grace'
  | 'expired'

export interface MySubscription {
  plan: PlanRow | null
  subscription: SubscriptionRow | null
  state: SubscriptionState
  /** মেয়াদ শেষ হতে বাকি দিন (active/expiring-এ); grace-এ গ্রেসের বাকি দিন। */
  daysLeft: number
  graceDays: number
}

// সেলারের বর্তমান প্ল্যান — সময়ের হিসাবেই অবস্থা ধরা হয়
// (প্রসেসর না চললেও ভুল দেখাবে না)।
export async function fetchMySubscription(
  sellerId: string,
): Promise<MySubscription> {
  const client = requireSupabase()
  const [subRes, settings] = await Promise.all([
    client
      .from('seller_subscriptions')
      .select('*')
      .eq('seller_id', sellerId)
      .maybeSingle(),
    fetchPlatformSettings().catch(() => ({} as Record<string, string>)),
  ])
  if (subRes.error) throw subRes.error
  const graceDays = graceDaysFromSettings(settings)
  const sub = (subRes.data as SubscriptionRow | null) ?? null
  if (!sub) {
    return { plan: null, subscription: null, state: 'free', daysLeft: 0, graceDays }
  }
  const now = Date.now()
  const endsAt = new Date(sub.ends_at).getTime()
  const graceEnd = endsAt + graceDays * 24 * 60 * 60 * 1000
  if (endsAt > now) {
    const daysLeft = Math.ceil((endsAt - now) / (24 * 60 * 60 * 1000))
    const { data: planData } = await client
      .from('subscription_plans')
      .select('*')
      .eq('id', sub.plan_id)
      .maybeSingle()
    return {
      plan: (planData as PlanRow | null) ?? null,
      subscription: sub,
      state: daysLeft <= 3 ? 'expiring' : 'active',
      daysLeft,
      graceDays,
    }
  }
  if (now < graceEnd) {
    const { data: planData } = await client
      .from('subscription_plans')
      .select('*')
      .eq('id', sub.plan_id)
      .maybeSingle()
    return {
      plan: (planData as PlanRow | null) ?? null,
      subscription: sub,
      state: 'grace',
      daysLeft: Math.ceil((graceEnd - now) / (24 * 60 * 60 * 1000)),
      graceDays,
    }
  }
  return {
    plan: null,
    subscription: sub,
    state: 'expired',
    daysLeft: 0,
    graceDays,
  }
}

// সেলারের পেমেন্টের ইতিহাস — নতুন আগে।
export async function fetchMyPayments(
  sellerId: string,
): Promise<PaymentRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('subscription_payments')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PaymentRow[]
}

// ব্যবহারের হিসাব — সার্ভারে আবার গুনে তারপর পড়া হয়।
export async function fetchUsage(sellerId: string): Promise<UsageRow> {
  const client = requireSupabase()
  const { error: rpcError } = await client.rpc('refresh_subscription_usage', {
    p_seller_id: sellerId,
  })
  if (rpcError) throw rpcError
  const { data, error } = await client
    .from('subscription_usage')
    .select('*')
    .eq('seller_id', sellerId)
    .maybeSingle()
  if (error) throw error
  return (data as UsageRow | null) ?? {
    seller_id: sellerId,
    active_pages: 0,
    storage_bytes: 0,
  }
}

// আরেকটা পেজ প্রকাশ করা যাবে কি — সার্ভারের চেক।
export async function canPublishPage(sellerId: string): Promise<boolean> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('can_publish_page', {
    p_seller_id: sellerId,
  })
  if (error) throw error
  return data === true
}

// ফ্রি সার্ভিসে কোন পেজটা চালু থাকবে — সেলারের বাছা।
export async function chooseKeptPage(pageId: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('choose_kept_page', {
    p_page_id: pageId,
  })
  if (error) throw error
}

// ছবি আপলোডের আগে স্টোরেজের সীমা — সীমা ছাড়ালে বাংলায় ভুল।
// ফ্রি প্ল্যানে সীমার সংখ্যা ভুলের মেসেজেও দেখানো হয় না।
export async function checkStorageBeforeUpload(
  sellerId: string,
  newBytes: number,
): Promise<void> {
  const [mySub, usage] = await Promise.all([
    fetchMySubscription(sellerId),
    fetchUsage(sellerId),
  ])
  const limitMb = mySub.plan ? mySub.plan.storage_mb : FREE_STORAGE_MB
  const limitBytes = limitMb * 1024 * 1024
  if (usage.storage_bytes + newBytes > limitBytes) {
    if (mySub.plan) {
      throw new Error(
        `এই প্যাকেজের স্টোরেজ সীমা (${storageMbLabel(limitMb)}) শেষ হয়ে গেছে — পুরনো ছবি মুছে বা বড় প্যাকেজ নিয়ে আবার চেষ্টা করুন।`,
      )
    }
    throw new Error(
      'ছবির স্টোরেজের সীমা শেষ হয়ে গেছে — পুরনো ছবি মুছে বা প্যাকেজ নিয়ে আবার চেষ্টা করুন।',
    )
  }
}

// ---------- Edge Function ডাকা (TrxID পেমেন্ট জমা) ----------

async function callAuthedFunction(
  name: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  if (!supabase) throw new Error('Supabase কনফিগার করা হয়নি।')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('লগইন করা নেই — আবার লগইন করুন।')
  const res = await fetch(functionsUrl(name), {
    method: 'POST',
    headers: {
      apikey: anonKeyHeader().apikey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const out = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok || out.ok === false) {
    throw new Error(
      typeof out.error === 'string'
        ? out.error
        : 'কাজটা করা যায়নি — আবার চেষ্টা করুন।',
    )
  }
  return out
}

export async function submitSubscriptionPayment(input: {
  planId: string
  method: PaymentMethod
  trxid: string
  senderNumber: string
}): Promise<{ paymentId: string; amountBdt: number }> {
  const out = await callAuthedFunction('submit-subscription-payment', {
    plan_id: input.planId,
    method: input.method,
    trxid: input.trxid,
    sender_number: input.senderNumber,
  })
  return {
    paymentId: String(out.payment_id ?? ''),
    amountBdt: Number(out.amount_bdt ?? 0),
  }
}
