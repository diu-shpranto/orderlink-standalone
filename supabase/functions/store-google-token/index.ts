// Supabase Edge Function: store-google-token
// সেলার Google দিয়ে Sheet সংযোগ করলে OAuth-এর টোকেন এনক্রিপ্ট করে রাখে।
//
// Secrets (Supabase Dashboard → Edge Functions → Secrets, বা CLI:
//   supabase secrets set SHEET_TOKEN_KEY=...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SHEET_TOKEN_KEY
//   (SHEET_TOKEN_KEY = base64-এ ৩২ বাইটের AES-256 চাবি — কখনো কোডে
//   বা গিটে রাখা যাবে না।)
// টোকেন কখনো plain text-এ ডাটাবেসে থাকে না — শুধু AES-GCM এনক্রিপ্ট করা।
// Deploy: supabase functions deploy store-google-token
// (JWT যাচাই চালু — শুধু লগইন করা সেলার নিজের টোকেন রাখতে পারে।)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ---------- base64 (standard + url-safe) ----------

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

// ---------- AES-GCM এনক্রিপশন ----------
// ফরম্যাট: v1.<base64url(iv)>.<base64url(ciphertext)>

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

async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { email?: string }
    return typeof data.email === 'string' ? data.email : null
  } catch {
    return null
  }
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

    // লগইন করা সেলার কে — JWT থেকে (Verify JWT চালু থাকলেও নিজে যাচাই)।
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
      refresh_token?: string
      access_token?: string
      access_token_expires_at?: string
      email?: string
    }
    const refreshToken =
      typeof body.refresh_token === 'string' ? body.refresh_token.trim() : ''
    const accessToken =
      typeof body.access_token === 'string' ? body.access_token.trim() : ''
    if (!refreshToken && !accessToken) {
      return jsonResponse({ ok: false, error: 'কোনো টোকেন দেওয়া হয়নি।' }, 400)
    }

    // Google অ্যাকাউন্টের ইমেইল — দেওয়া থাকলে সেটা, না হলে userinfo থেকে।
    let googleEmail =
      typeof body.email === 'string' ? body.email.trim() : ''
    if (!googleEmail && accessToken) {
      googleEmail = (await fetchGoogleEmail(accessToken)) ?? ''
    }
    if (!googleEmail) googleEmail = userData.user.email ?? ''

    const { data: existing } = await admin
      .from('seller_google_tokens')
      .select('id, google_email, sheet_id, sheet_url')
      .eq('seller_id', sellerId)
      .maybeSingle()

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (googleEmail) patch.google_email = googleEmail
    if (accessToken) {
      patch.access_token_enc = await encryptToken(accessToken)
      // Google access token ১ ঘণ্টা চলে — দেওয়া না থাকলে ৫৫ মিনিট ধরা হয়।
      patch.access_token_expires_at =
        typeof body.access_token_expires_at === 'string' &&
        body.access_token_expires_at
          ? body.access_token_expires_at
          : new Date(Date.now() + 55 * 60 * 1000).toISOString()
    }

    if (refreshToken) {
      // নতুন সংযোগ (বা আবার যুক্ত করা) — refresh token বদলে যায়।
      patch.refresh_token_enc = await encryptToken(refreshToken)
      patch.connected_at = new Date().toISOString()
      const { error } = await admin.from('seller_google_tokens').upsert(
        {
          seller_id: sellerId,
          ...patch,
        },
        { onConflict: 'seller_id' },
      )
      if (error) throw error
    } else {
      // শুধু access token তাজা করা — আগের সংযোগ থাকতেই হবে।
      if (!existing) {
        return jsonResponse(
          { ok: false, error: 'প্রথমে Google অ্যাকাউন্ট যুক্ত করুন।' },
          400,
        )
      }
      const { error } = await admin
        .from('seller_google_tokens')
        .update(patch)
        .eq('seller_id', sellerId)
      if (error) throw error
    }

    const { data: after } = await admin
      .from('seller_google_tokens')
      .select('google_email, sheet_id, sheet_url')
      .eq('seller_id', sellerId)
      .maybeSingle()
    return jsonResponse({
      ok: true,
      google_email: (after as { google_email?: string } | null)?.google_email ?? googleEmail,
      has_sheet: Boolean(
        (after as { sheet_id?: string | null } | null)?.sheet_id,
      ),
    })
  } catch (err) {
    console.error('store-google-token ভুল:', err)
    return jsonResponse(
      { ok: false, error: 'Google সংযোগ সেভ করা যায়নি — আবার চেষ্টা করুন।' },
      500,
    )
  }
})
