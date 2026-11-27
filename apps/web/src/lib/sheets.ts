// Google Sheet অটো-সিঙ্ক — ক্লায়েন্ট পক্ষ।
// টোকেন কখনো ব্রাউজারে সেভ হয় না, কখনো ক্লায়েন্টে ফেরত আসে না —
// শুধু Edge Function (service-role) টোকেন ছোঁয়।
// অর্ডার জমা হলেই sync-order ফায়ার-অ্যান্ড-ফরগেট ডাকা হয় —
// সিঙ্ক ব্যর্থ হলেও অর্ডার আটকায় না।

import {
  anonKeyHeader,
  functionsUrl,
  requireSupabase,
  supabase,
} from './supabase.ts'

export interface SheetConnection {
  google_email: string | null
  sheet_id: string | null
  sheet_url: string | null
  connected_at: string
}

export interface SheetSyncSummary {
  synced: number
  pending: number
  failed: number
  notConnected: number
  lastSyncedAt: string | null
}

export interface SheetSyncEvent {
  id: string
  order_id: string
  order_code: string | null
  status: 'synced' | 'pending' | 'failed'
  attempts: number
  last_error: string | null
  synced_at: string | null
  created_at: string
}

export const SHEET_STATUS_BN: Record<string, string> = {
  pending: 'সিঙ্কের অপেক্ষায়',
  synced: 'Sheet-এ গেছে',
  failed: 'সিঙ্ক ব্যর্থ হয়েছে',
  not_connected: 'Sheet যুক্ত করা হয়নি',
}

const CONNECT_FLAG = 'ol-sheet-connect'

// ---------- সংযোগের অবস্থা ----------

export async function fetchSheetConnection(
  sellerId: string,
): Promise<SheetConnection | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('seller_google_tokens')
    // টোকেনের কলাম কখনো পড়া হয় না — শুধু সংযোগের তথ্য।
    .select('google_email, sheet_id, sheet_url, connected_at')
    .eq('seller_id', sellerId)
    .maybeSingle()
  if (error) throw error
  return (data as SheetConnection | null) ?? null
}

export async function fetchSheetSyncSummary(
  sellerId: string,
): Promise<SheetSyncSummary> {
  const client = requireSupabase()
  const { data: orders, error } = await client
    .from('orders')
    .select('sheet_status')
    .eq('seller_id', sellerId)
  if (error) throw error
  const rows = (orders ?? []) as { sheet_status: string }[]
  const count = (s: string) =>
    rows.filter((r) => r.sheet_status === s).length
  const { data: lastSynced } = await client
    .from('sheet_sync_events')
    .select('synced_at')
    .eq('seller_id', sellerId)
    .eq('status', 'synced')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return {
    synced: count('synced'),
    pending: count('pending'),
    failed: count('failed'),
    notConnected: count('not_connected'),
    lastSyncedAt:
      (lastSynced as { synced_at: string | null } | null)?.synced_at ?? null,
  }
}

export async function fetchSheetSyncEvents(
  sellerId: string,
  limit = 20,
): Promise<SheetSyncEvent[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('sheet_sync_events')
    .select('id, order_id, status, attempts, last_error, synced_at, created_at, orders(order_code)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    order_id: row.order_id as string,
    order_code:
      (row.orders as { order_code?: string } | null)?.order_code ?? null,
    status: row.status as SheetSyncEvent['status'],
    attempts: Number(row.attempts ?? 1),
    last_error: (row.last_error as string | null) ?? null,
    synced_at: (row.synced_at as string | null) ?? null,
    created_at: row.created_at as string,
  }))
}

// ---------- Edge Function ডাকার হেডার ----------

async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) throw new Error('Supabase কনফিগার করা হয়নি।')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('লগইন করা নেই — আবার লগইন করুন।')
  return {
    apikey: anonKeyHeader().apikey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function callFunction(
  name: string,
  body: unknown,
  authed: boolean,
): Promise<Record<string, unknown>> {
  const headers = authed ? await authHeaders() : anonKeyHeader()
  const res = await fetch(functionsUrl(name), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as Record<
    string,
    unknown
  >
  if (!res.ok || data.ok === false) {
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : 'কাজটা করা যায়নি — আবার চেষ্টা করুন।',
    )
  }
  return data
}

// ---------- Google সংযোগ (OAuth) ----------

export async function connectGoogleSheets(): Promise<void> {
  const client = requireSupabase()
  // OAuth থেকে ফিরে এলে Settings পেজ যাতে টোকেন ধরতে পারে।
  localStorage.setItem(CONNECT_FLAG, '1')
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes:
        'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
      queryParams: { access_type: 'offline', prompt: 'consent' },
      redirectTo: `${window.location.origin}/dashboard/settings`,
    },
  })
  if (error) {
    localStorage.removeItem(CONNECT_FLAG)
    throw error
  }
}

// OAuth থেকে ফিরে আসার পর সেশনের provider টোকেন সার্ভারে পাঠানো।
// refresh token না থাকলে (Google দেয়নি) শুধু access token পাঠানো হয়।
export async function captureGoogleTokensAfterRedirect(): Promise<{
  googleEmail: string | null
  hasRefreshToken: boolean
} | null> {
  if (localStorage.getItem(CONNECT_FLAG) !== '1') return null
  localStorage.removeItem(CONNECT_FLAG)
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (!session) return null
  const refreshToken = session.provider_refresh_token ?? null
  const accessToken = session.provider_token ?? null
  if (!refreshToken && !accessToken) return null
  const result = await callFunction(
    'store-google-token',
    {
      refresh_token: refreshToken,
      access_token: accessToken,
      // Google access token ১ ঘণ্টা চলে — সেশন থেকে মেয়াদ জানা
      // যায় না বলে ৫৫ মিনিট ধরা হয়।
      access_token_expires_at: accessToken
        ? new Date(Date.now() + 55 * 60 * 1000).toISOString()
        : undefined,
    },
    true,
  )
  return {
    googleEmail:
      typeof result.google_email === 'string' ? result.google_email : null,
    hasRefreshToken: Boolean(refreshToken),
  }
}

// Settings খুললে সেশনে তাজা provider access token থাকলে সার্ভারের
// কপিটা তাজা করা হয় (সিঙ্ক যাতে ১ ঘণ্টার পরেও চলে)।
export async function refreshStoredAccessToken(): Promise<void> {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.provider_token
  if (!accessToken) return
  try {
    await callFunction(
      'store-google-token',
      {
        access_token: accessToken,
        access_token_expires_at: new Date(
          Date.now() + 55 * 60 * 1000,
        ).toISOString(),
      },
      true,
    )
  } catch {
    // তাজা করা না গেলে সিঙ্ক আটকাবে না — refresh token-ই মূল ভরসা।
  }
}

// ---------- Sheet বানানো / যুক্ত করা / ছিন্ন করা ----------

export async function setupSheet(
  action: 'create' | 'link',
  opts: { sheetUrl?: string; shopName?: string },
): Promise<{ sheet_id: string; sheet_url: string }> {
  const data = await callFunction(
    'sheets-setup',
    {
      action,
      sheet_url: opts.sheetUrl,
      shop_name: opts.shopName,
    },
    true,
  )
  return {
    sheet_id: data.sheet_id as string,
    sheet_url: data.sheet_url as string,
  }
}

export async function disconnectSheet(): Promise<void> {
  await callFunction('sheets-disconnect', {}, true)
}

// ---------- রিট্রাই ও অর্ডার সিঙ্ক ----------

// "ব্যর্থ সিঙ্ক আবার চেষ্টা করুন" — ব্যর্থ সারিগুলো এখনই আবার চালায়।
export async function retryFailedSyncs(
  sellerId: string,
): Promise<{ processed: number; synced: number; failed: number }> {
  const data = await callFunction(
    'sheets-retry',
    { seller_id: sellerId, reset_attempts: true },
    false,
  )
  return {
    processed: Number(data.processed ?? 0),
    synced: Number(data.synced ?? 0),
    failed: Number(data.failed ?? 0),
  }
}

// অর্ডার জমার পর ফায়ার-অ্যান্ড-ফরগেট — সিঙ্ক ব্যর্থ হলেও অর্ডার
// আটকায় না; কিউ থেকে রিট্রাই হবে। ভুল চুপচাপ গিলে ফেলা হয়।
export function triggerOrderSync(orderId: string): void {
  fetch(functionsUrl('sync-order'), {
    method: 'POST',
    headers: anonKeyHeader(),
    body: JSON.stringify({ order_id: orderId }),
  }).catch(() => {
    // সিঙ্কের ডাক ব্যর্থ — কিউতে সারি আছেই, রিট্রাই তুলে নেবে।
  })
}
