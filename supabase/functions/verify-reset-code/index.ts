// Supabase Edge Function: verify-reset-code
// ৬-সংখ্যার কোড যাচাই করে নতুন পাসওয়ার্ড বসায় (service-role দিয়ে)।
// নিয়ম: ২০ মিনিট মেয়াদ, একবার ব্যবহারযোগ্য, ৫ বার ভুলে ১৫ মিনিট লক,
// নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষর। সফল হলে পুরনো সেশনগুলোও বাতিল হয়।
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (send-reset-code-এর মতোই)।
// Deploy: supabase functions deploy verify-reset-code --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15
const MIN_PASSWORD_LENGTH = 8

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

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ধ্রুব-সময়ে তুলনা (timing attack এড়াতে)।
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'শুধু POST চলবে।' }, 405)
  }

  try {
    const { email, code, newPassword } = (await req.json()) as {
      email?: string
      code?: string
      newPassword?: string
    }
    const cleanEmail =
      typeof email === 'string' ? email.trim().toLowerCase() : ''
    const cleanCode = typeof code === 'string' ? code.trim() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return jsonResponse({ ok: false, error: 'সঠিক ইমেইল দিন।' }, 400)
    }
    if (!/^\d{6}$/.test(cleanCode)) {
      return jsonResponse({ ok: false, error: '৬ সংখ্যার কোড দিন।' }, 400)
    }
    if (
      typeof newPassword !== 'string' ||
      newPassword.length < MIN_PASSWORD_LENGTH
    ) {
      return jsonResponse(
        { ok: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।' },
        400,
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'সার্ভার কনফিগার করা হয়নি।' }, 500)
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: row } = await admin
      .from('password_resets')
      .select('id, seller_id, code_hash, expires_at, attempts, locked_until, used_at')
      .eq('email', cleanEmail)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!row) {
      return jsonResponse(
        { ok: false, error: 'কোডটি ভুল বা মেয়াদ শেষ। আবার কোড পাঠান।' },
        400,
      )
    }

    const now = new Date()
    if (row.locked_until && new Date(row.locked_until as string) > now) {
      return jsonResponse(
        {
          ok: false,
          error: 'অনেকবার ভুল কোড দেওয়া হয়েছে — ১৫ মিনিট পরে আবার চেষ্টা করুন।',
        },
        429,
      )
    }
    if (new Date(row.expires_at as string) <= now) {
      return jsonResponse(
        { ok: false, error: 'কোডের মেয়াদ শেষ — আবার কোড পাঠান।' },
        400,
      )
    }

    const incomingHash = await sha256Hex(cleanCode)
    if (!safeEqual(incomingHash, row.code_hash as string)) {
      const nextAttempts = (row.attempts as number) + 1
      const updates: Record<string, unknown> = { attempts: nextAttempts }
      if (nextAttempts >= MAX_ATTEMPTS) {
        updates.locked_until = new Date(
          now.getTime() + LOCK_MINUTES * 60 * 1000,
        ).toISOString()
      }
      await admin.from('password_resets').update(updates).eq('id', row.id)
      const remaining = MAX_ATTEMPTS - nextAttempts
      return jsonResponse(
        {
          ok: false,
          error:
            remaining > 0
              ? `কোডটি ভুল — আর ${remaining} বার চেষ্টা করা যাবে।`
              : 'অনেকবার ভুল কোড দেওয়া হয়েছে — ১৫ মিনিট পরে আবার চেষ্টা করুন।',
        },
        400,
      )
    }

    // কোড ঠিক — একবার ব্যবহারযোগ্য চিহ্ন দিয়ে পাসওয়ার্ড বদলান।
    await admin
      .from('password_resets')
      .update({ used_at: now.toISOString() })
      .eq('id', row.id)

    const { error: updateError } = await admin.auth.admin.updateUserById(
      row.seller_id as string,
      { password: newPassword },
    )
    if (updateError) throw updateError

    // পুরনো সেশন বাতিল (না হলেও পাসওয়ার্ড বদল সম্পূর্ণ)।
    try {
      await admin.auth.admin.signOut(row.seller_id as string)
    } catch {
      // signOut না থাকলে বা ব্যর্থ হলে উপেক্ষা করুন।
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    console.error('verify-reset-code ভুল:', err)
    return jsonResponse(
      { ok: false, error: 'যাচাই করা যায়নি — আবার চেষ্টা করুন।' },
      500,
    )
  }
})
