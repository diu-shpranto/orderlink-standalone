// Supabase Edge Function: sync-order
// একটা অর্ডার সেলারের Google Sheet-এর সেদিনের (Asia/Dhaka তারিখ)
// ট্যাবে সারি হিসেবে যোগ করে। অর্ডারই সত্যের উৎস — সিঙ্ক ব্যর্থ হলেও
// অর্ডার হারায় না; কিউতে failed হয়ে ৩০ মিনিট পর আবার চেষ্টা হয়।
//
// Secrets (Supabase Dashboard → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SHEET_TOKEN_KEY,
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   (GOOGLE_CLIENT_* — GCP OAuth ক্লায়েন্ট "Orderlink"-এর; refresh
//   token থেকে নতুন access token বানাতে লাগে। না থাকলে শুধু
//   সংযোগের সময় পাওয়া access token (১ ঘণ্টা) দিয়ে সিঙ্ক চলে,
//   মেয়াদ শেষ হলে সেলারকে আবার যুক্ত করতে বলা হয়।)
// Deploy: supabase functions deploy sync-order --no-verify-jwt
// (অর্ডার দেওয়ার সময় কাস্টমার লগইন ছাড়া ডাকে, তাই JWT যাচাই বন্ধ।
//  ফাংশন কোনো কাস্টমার তথ্য ফেরত দেয় না — শুধু { ok } জানায়।)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const MAX_ATTEMPTS = 10
const RETRY_DELAY_MINUTES = 30

const SHEET_HEADERS = [
  'Order ID',
  'Date',
  'Customer Name',
  'Phone',
  'Product',
  'Quantity',
  'Unit Price',
  'Delivery Charge',
  'Total',
  'Address',
  'Status',
  'Special Note',
]

const STATUS_BN: Record<string, string> = {
  new: 'নতুন',
  confirmed: 'নিশ্চিত',
  processing: 'প্রস্তুত হচ্ছে',
  shipped: 'পাঠানো হয়েছে',
  delivered: 'ডেলিভারি হয়েছে',
  cancelled: 'বাতিল',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ---------- base64 ----------

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64ToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// ---------- AES-GCM ----------

async function getAesKey(): Promise<CryptoKey> {
  const keyB64 = Deno.env.get('SHEET_TOKEN_KEY') ?? ''
  if (!keyB64) throw new Error('SHEET_TOKEN_KEY সেট করা হয়নি।')
  const keyBytes = base64ToBytes(keyB64)
  if (keyBytes.length !== 32) {
    throw new Error('SHEET_TOKEN_KEY ৩২ বাইটের হতে হবে।')
  }
  return await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

async function encryptToken(plain: string): Promise<string> {
  const key = await getAesKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  )
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(ct))}`
}

async function decryptToken(enc: string): Promise<string> {
  const parts = enc.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw new Error('টোকেনের ফরম্যাট চেনা যাচ্ছে না।')
  }
  const key = await getAesKey()
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(parts[1]) },
    key,
    base64ToBytes(parts[2]),
  )
  return new TextDecoder().decode(plain)
}

// ---------- ঢাকা তারিখ ----------

function dhakaDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Dhaka',
  })
}

// ---------- Google টোকেন ----------

class NeedsReconnectError extends Error {}

interface TokenRow {
  id: string
  seller_id: string
  google_email: string | null
  refresh_token_enc: string | null
  access_token_enc: string | null
  access_token_expires_at: string | null
  sheet_id: string | null
  sheet_url: string | null
}

// মেয়াদ থাকা access token থাকলে সেটাই; না থাকলে refresh token থেকে
// নতুন বানানো হয় (GOOGLE_CLIENT_ID/SECRET লাগে)। কিছুই না থাকলে
// NeedsReconnectError — সেলারকে আবার Google যুক্ত করতে হবে।
async function getAccessToken(
  admin: ReturnType<typeof createClient>,
  tokenRow: TokenRow,
): Promise<string> {
  const now = Date.now()
  if (tokenRow.access_token_enc && tokenRow.access_token_expires_at) {
    const expiresAt = new Date(tokenRow.access_token_expires_at).getTime()
    if (expiresAt > now + 60 * 1000) {
      return await decryptToken(tokenRow.access_token_enc)
    }
  }
  if (!tokenRow.refresh_token_enc) {
    throw new NeedsReconnectError('Google refresh token নেই।')
  }
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
  if (!clientId || !clientSecret) {
    throw new NeedsReconnectError(
      'Google ক্লায়েন্ট সিক্রেট সেট করা হয়নি — access token-এর মেয়াদ শেষ।',
    )
  }
  const refreshToken = await decryptToken(tokenRow.refresh_token_enc)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    if (
      res.status === 400 &&
      (errText.includes('invalid_grant') || errText.includes('invalid_client'))
    ) {
      throw new NeedsReconnectError('Google refresh token বাতিল হয়েছে।')
    }
    throw new Error(`Google টোকেন রিফ্রেশ হয়নি (HTTP ${res.status})।`)
  }
  const data = (await res.json()) as {
    access_token?: string
    expires_in?: number
    refresh_token?: string
  }
  if (!data.access_token) {
    throw new Error('Google টোকেন রিফ্রেশ হয়নি — access token আসেনি।')
  }
  const patch: Record<string, unknown> = {
    access_token_enc: await encryptToken(data.access_token),
    access_token_expires_at: new Date(
      now + (data.expires_in ?? 3600) * 1000,
    ).toISOString(),
    updated_at: new Date().toISOString(),
  }
  // Google মাঝে মাঝে নতুন refresh token দেয় — দিলে সেটাই রাখতে হয়।
  if (data.refresh_token) {
    patch.refresh_token_enc = await encryptToken(data.refresh_token)
  }
  await admin
    .from('seller_google_tokens')
    .update(patch)
    .eq('id', tokenRow.id)
  return data.access_token
}

// ---------- Google Sheets API ----------

async function googleFetch(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const data = (await res.json()) as {
        error?: { message?: string }
      }
      if (data.error?.message) msg = data.error.message
    } catch {
      // JSON না হলে status-ই থাকবে।
    }
    throw new Error(`Google Sheets ভুল: ${msg}`)
  }
  return await res.json()
}

async function ensureTabWithHeaders(
  accessToken: string,
  sheetId: string,
  tabName: string,
): Promise<void> {
  const meta = (await googleFetch(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets(properties(title))`,
  )) as { sheets?: { properties?: { title?: string } }[] }
  const exists = (meta.sheets ?? []).some(
    (s) => s.properties?.title === tabName,
  )
  if (!exists) {
    await googleFetch(
      accessToken,
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: tabName } } }],
        }),
      },
    )
    await googleFetch(
      accessToken,
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`'${tabName}'!A1:L1`)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        body: JSON.stringify({
          range: `'${tabName}'!A1:L1`,
          majorDimension: 'ROWS',
          values: [SHEET_HEADERS],
        }),
      },
    )
  }
}

async function sheetHasOrder(
  accessToken: string,
  sheetId: string,
  tabName: string,
  orderCode: string,
): Promise<boolean> {
  const data = (await googleFetch(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`'${tabName}'!A:A`)}?majorDimension=COLUMNS`,
  )) as { values?: string[][] }
  const col = data.values?.[0] ?? []
  return col.includes(orderCode)
}

async function appendOrderRow(
  accessToken: string,
  sheetId: string,
  tabName: string,
  row: (string | number)[],
): Promise<void> {
  await googleFetch(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`'${tabName}'!A:L`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({
        range: `'${tabName}'!A:L`,
        majorDimension: 'ROWS',
        values: [row],
      }),
    },
  )
}

// ---------- মূল সিঙ্ক ----------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'শুধু POST চলবে।' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'সার্ভার কনফিগার করা হয়নি।' }, 500)
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { order_id: orderId } = (await req.json()) as {
      order_id?: string
    }
    if (!orderId) {
      return jsonResponse({ ok: false, error: 'order_id লাগবে।' }, 400)
    }

    const { data: order } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) {
      return jsonResponse({ ok: false, error: 'অর্ডার পাওয়া যায়নি।' }, 404)
    }
    const o = order as Record<string, unknown>
    const sellerId = o.seller_id as string

    // কিউ সারি — না থাকলে (পুরনো অর্ডার) বানিয়ে নেওয়া হয়।
    let { data: queue } = await admin
      .from('sheet_sync_queue')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle()
    if (!queue) {
      const { data: created } = await admin
        .from('sheet_sync_queue')
        .insert({ seller_id: sellerId, order_id: orderId, status: 'pending' })
        .select('*')
        .single()
      queue = created
    }
    if (!queue) {
      return jsonResponse({ ok: false, error: 'কিউ সারি বানানো যায়নি।' }, 500)
    }
    const q = queue as Record<string, unknown>
    if (q.status === 'synced') {
      return jsonResponse({ ok: true, already: true })
    }

    // একই অর্ডার দুই জায়গা থেকে একসঙ্গে সিঙ্ক হবে না — processing দখল।
    const attempts = Number(q.attempts ?? 0) + 1
    const { data: claimed } = await admin
      .from('sheet_sync_queue')
      .update({ status: 'processing', attempts })
      .eq('id', q.id as string)
      .in('status', ['pending', 'failed'])
      .select('id')
    if (!claimed || (claimed as unknown[]).length === 0) {
      return jsonResponse({ ok: true, skipped: 'already-processing' })
    }

    async function markFailed(lastError: string): Promise<void> {
      const giveUp = attempts >= MAX_ATTEMPTS
      await admin
        .from('sheet_sync_queue')
        .update({
          status: 'failed',
          last_error: lastError,
          next_retry_at: new Date(
            Date.now() +
              (giveUp ? 365 * 24 * 60 : RETRY_DELAY_MINUTES) * 60 * 1000,
          ).toISOString(),
        })
        .eq('id', q.id as string)
      await admin
        .from('orders')
        .update({ sheet_status: 'failed' })
        .eq('id', orderId)
      await admin.from('sheet_sync_events').insert({
        seller_id: sellerId,
        order_id: orderId,
        status: 'failed',
        attempts,
        last_error: lastError,
      })
    }

    async function markSynced(): Promise<void> {
      await admin
        .from('sheet_sync_queue')
        .update({ status: 'synced', last_error: null })
        .eq('id', q.id as string)
      await admin
        .from('orders')
        .update({ sheet_status: 'synced' })
        .eq('id', orderId)
      await admin.from('sheet_sync_events').insert({
        seller_id: sellerId,
        order_id: orderId,
        status: 'synced',
        attempts,
        synced_at: new Date().toISOString(),
      })
    }

    // Google সংযোগ + Sheet আছে কি?
    const { data: tokenRow } = await admin
      .from('seller_google_tokens')
      .select('*')
      .eq('seller_id', sellerId)
      .maybeSingle()
    const token = tokenRow as TokenRow | null
    if (!token || !token.sheet_id) {
      await admin
        .from('sheet_sync_queue')
        .update({
          status: 'skipped',
          last_error: 'Google Sheet এখনো যুক্ত করা হয়নি।',
        })
        .eq('id', q.id as string)
      await admin
        .from('orders')
        .update({ sheet_status: 'not_connected' })
        .eq('id', orderId)
      await admin.from('sheet_sync_events').insert({
        seller_id: sellerId,
        order_id: orderId,
        status: 'pending',
        attempts,
        last_error: 'Google Sheet এখনো যুক্ত করা হয়নি — Settings → Google Sheets থেকে যুক্ত করুন।',
      })
      return jsonResponse({ ok: false, reason: 'not_connected' })
    }

    try {
      const accessToken = await getAccessToken(admin, token)
      const sheetId = token.sheet_id
      const tabName = dhakaDate(o.created_at as string)
      await ensureTabWithHeaders(accessToken, sheetId, tabName)

      // ডুপ্লিকেট আটকানো — Order ID আগেই থাকলে আর সারি যোগ হবে না।
      if (await sheetHasOrder(accessToken, sheetId, tabName, o.order_code as string)) {
        await markSynced()
        return jsonResponse({ ok: true, already: true })
      }

      // পণ্যের নাম + একক দাম (অর্ডারে একক দাম আলাদা থাকে না —
      // মোট থেকে ডেলিভারি চার্জ বাদ দিয়ে পরিমাণে ভাগ করা হয়)।
      let productName = '—'
      if (o.product_id) {
        const { data: product } = await admin
          .from('products')
          .select('name')
          .eq('id', o.product_id as string)
          .maybeSingle()
        if (product) productName = (product as { name: string }).name
      }
      const unitPrice =
        Math.round(
          ((Number(o.total) - Number(o.delivery_charge)) /
            Number(o.quantity)) *
            100,
        ) / 100
      const address = [
        o.address_line,
        o.upazila,
        o.district,
        o.division,
      ]
        .filter((p) => typeof p === 'string' && p.trim())
        .join(', ')

      await appendOrderRow(accessToken, sheetId, tabName, [
        o.order_code as string,
        tabName,
        o.customer_name as string,
        o.customer_phone as string,
        productName,
        Number(o.quantity),
        unitPrice,
        Number(o.delivery_charge),
        Number(o.total),
        address,
        STATUS_BN[(o.status as string) ?? 'new'] ?? (o.status as string),
        (o.customer_note as string) ?? '',
      ])
      await markSynced()
      return jsonResponse({ ok: true })
    } catch (err) {
      if (err instanceof NeedsReconnectError) {
        const msg =
          'Google সংযোগের মেয়াদ শেষ হয়েছে — Settings → Google Sheets থেকে আবার যুক্ত করুন।'
        await markFailed(msg)
        return jsonResponse({ ok: false, reason: 'needs_reconnect' })
      }
      const msg =
        err instanceof Error ? err.message : 'সিঙ্ক করা যায়নি।'
      await markFailed(msg.slice(0, 500))
      return jsonResponse({ ok: false, error: msg.slice(0, 200) })
    }
  } catch (err) {
    console.error('sync-order ভুল:', err)
    return jsonResponse(
      { ok: false, error: 'সিঙ্ক করা যায়নি — পরে আবার চেষ্টা হবে।' },
      500,
    )
  }
})
