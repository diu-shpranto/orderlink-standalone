// Supabase Edge Function: sheets-setup
// সেলারের Google Sheet যুক্ত করা — নতুন Sheet বানানো বা আগের
// Sheet-এর লিংক যাচাই করে যুক্ত করা। যুক্ত করার সময় আজকের ট্যাব
// (Asia/Dhaka তারিখ) + হেডার সারি বসিয়ে লেখা যায় কি না যাচাই হয়।
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SHEET_TOKEN_KEY,
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (টোকেন রিফ্রেশের জন্য;
//   না থাকলে সংযোগের সময়ের access token দিয়েই চলে)।
// Deploy: supabase functions deploy sheets-setup
// (JWT যাচাই চালু — শুধু লগইন করা সেলার নিজের Sheet যুক্ত করতে পারে।)
//
// নোট: drive.file স্কোপে শুধু এই অ্যাপের বানানো ফাইল আর ব্যবহারকারী
// Drive থেকে খুলে দেওয়া ফাইলই খোলা যায় — শুধু লিংক পেস্ট করলে
// পুরনো Sheet নাও খুলতে পারে; তখন নতুন Sheet বানানোই নির্ভরযোগ্য।

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ---------- base64 + AES-GCM (sync-order-এর মতোই) ----------

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

function dhakaToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
}

class NeedsReconnectError extends Error {}

interface TokenRow {
  id: string
  seller_id: string
  refresh_token_enc: string | null
  access_token_enc: string | null
  access_token_expires_at: string | null
}

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
    throw new NeedsReconnectError('Google ক্লায়েন্ট সিক্রেট সেট করা হয়নি।')
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
  if (data.refresh_token) {
    patch.refresh_token_enc = await encryptToken(data.refresh_token)
  }
  await admin
    .from('seller_google_tokens')
    .update(patch)
    .eq('id', tokenRow.id)
  return data.access_token
}

// ---------- Google API ----------

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
      const data = (await res.json()) as { error?: { message?: string } }
      if (data.error?.message) msg = data.error.message
    } catch {
      // JSON না হলে status-ই থাকবে।
    }
    const err = new Error(`Google API ভুল: ${msg}`) as Error & {
      status?: number
    }
    err.status = res.status
    throw err
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

function extractSheetId(url: string): string | null {
  const byPath = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (byPath) return byPath[1]
  const byQuery = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (byQuery) return byQuery[1]
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) return url.trim()
  return null
}

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
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) {
      return jsonResponse({ ok: false, error: 'লগইন করা নেই।' }, 401)
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: userData, error: userError } =
      await admin.auth.getUser(jwt)
    if (userError || !userData.user) {
      return jsonResponse({ ok: false, error: 'লগইন করা নেই।' }, 401)
    }
    const sellerId = userData.user.id

    const body = (await req.json()) as {
      action?: string
      sheet_url?: string
      shop_name?: string
    }
    const action = body.action ?? ''
    if (action !== 'create' && action !== 'link') {
      return jsonResponse(
        { ok: false, error: 'action হতে হবে create বা link।' },
        400,
      )
    }

    const { data: tokenRow } = await admin
      .from('seller_google_tokens')
      .select('*')
      .eq('seller_id', sellerId)
      .maybeSingle()
    if (!tokenRow) {
      return jsonResponse(
        { ok: false, error: 'প্রথমে Google অ্যাকাউন্ট যুক্ত করুন।' },
        400,
      )
    }
    const token = tokenRow as TokenRow

    let accessToken: string
    try {
      accessToken = await getAccessToken(admin, token)
    } catch (err) {
      if (err instanceof NeedsReconnectError) {
        return jsonResponse(
          {
            ok: false,
            reason: 'needs_reconnect',
            error:
              'Google সংযোগের মেয়াদ শেষ হয়েছে — আবার Google যুক্ত করুন।',
          },
          400,
        )
      }
      throw err
    }

    let sheetId: string
    if (action === 'create') {
      const shopName =
        typeof body.shop_name === 'string' && body.shop_name.trim()
          ? body.shop_name.trim()
          : 'আমার দোকান'
      const created = (await googleFetch(
        accessToken,
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          body: JSON.stringify({
            name: `Orderlink — ${shopName} — Orders`,
            mimeType: 'application/vnd.google-apps.spreadsheet',
          }),
        },
      )) as { id?: string }
      if (!created.id) {
        throw new Error('Google Sheet বানানো যায়নি।')
      }
      sheetId = created.id
    } else {
      const url =
        typeof body.sheet_url === 'string' ? body.sheet_url.trim() : ''
      const found = extractSheetId(url)
      if (!found) {
        return jsonResponse(
          { ok: false, error: 'সঠিক Google Sheet লিংক দিন।' },
          400,
        )
      }
      sheetId = found
      // পড়া যায় কি না যাচাই — না গেলে drive.file স্কোপে এই ফাইল
      // খোলা যাবে না (শুধু লিংক পেস্ট করলে হয় না)।
      try {
        await googleFetch(
          accessToken,
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=spreadsheetId`,
        )
      } catch (err) {
        const status = (err as Error & { status?: number }).status
        if (status === 403 || status === 404) {
          return jsonResponse(
            {
              ok: false,
              error:
                'এই Sheet-টি খোলা যাচ্ছে না — নতুন Sheet বানান, অথবা Sheet-টি আপনার Google Drive-এ আছে কি না দেখুন।',
            },
            400,
          )
        }
        throw err
      }
    }

    // আজকের ট্যাব + হেডার বসিয়ে লেখা যায় কি না যাচাই।
    await ensureTabWithHeaders(accessToken, sheetId, dhakaToday())
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`
    const { error: updateError } = await admin
      .from('seller_google_tokens')
      .update({
        sheet_id: sheetId,
        sheet_url: sheetUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('seller_id', sellerId)
    if (updateError) throw updateError

    // আগে সংযোগ না থাকায় বাদ পড়া (skipped) অর্ডারগুলো আবার
    // pending-এ ফেরে — এরপর রিট্রাই সেগুলো Sheet-এ পাঠাবে।
    await admin
      .from('sheet_sync_queue')
      .update({ status: 'pending', attempts: 0, next_retry_at: new Date().toISOString() })
      .eq('seller_id', sellerId)
      .eq('status', 'skipped')
    await admin
      .from('orders')
      .update({ sheet_status: 'pending' })
      .eq('seller_id', sellerId)
      .eq('sheet_status', 'not_connected')

    return jsonResponse({ ok: true, sheet_id: sheetId, sheet_url: sheetUrl })
  } catch (err) {
    console.error('sheets-setup ভুল:', err)
    return jsonResponse(
      { ok: false, error: 'Sheet যুক্ত করা যায়নি — আবার চেষ্টা করুন।' },
      500,
    )
  }
})
