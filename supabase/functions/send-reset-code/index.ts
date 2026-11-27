// Supabase Edge Function: send-reset-code
// ৬-সংখ্যার পাসওয়ার্ড রিসেট কোড Brevo Transactional API দিয়ে পাঠায়।
//
// Secrets (Supabase Dashboard → Edge Functions → Secrets, বা CLI:
//   supabase secrets set BREVO_API_KEY=... BREVO_SENDER_EMAIL=...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BREVO_API_KEY, BREVO_SENDER_EMAIL
// কোড কখনো plain text-এ ডাটাবেসে থাকে না — শুধু SHA-256 হ্যাশ।
// নিবন্ধিত না হলেও একই উত্তর — ইমেইল আছে কি নেই বোঝা যাবে না।
// Deploy: supabase functions deploy send-reset-code --no-verify-jwt
// (রিসেট public — লগইন ছাড়া ডাকা হয়, তাই JWT যাচাই বন্ধ রাখতে হয়।)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const CODE_TTL_MINUTES = 20
const RESEND_COOLDOWN_SECONDS = 60

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

function makeCode(): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(100000 + (bytes[0] % 900000))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'শুধু POST চলবে।' }, 405)
  }

  try {
    const { email } = (await req.json()) as { email?: string }
    const cleanEmail =
      typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return jsonResponse({ ok: false, error: 'সঠিক ইমেইল দিন।' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const brevoApiKey = Deno.env.get('BREVO_API_KEY') ?? ''
    const brevoSender = Deno.env.get('BREVO_SENDER_EMAIL') ?? ''
    if (!supabaseUrl || !serviceRoleKey || !brevoApiKey || !brevoSender) {
      return jsonResponse({ ok: false, error: 'সার্ভার কনফিগার করা হয়নি।' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // নিবন্ধিত সেলার কি না — না হলেও একই উত্তর।
    const { data: seller } = await admin
      .from('sellers')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle()
    if (!seller) {
      return jsonResponse({ ok: true })
    }

    // ৬০ সেকেন্ডের ভেতরে আরেকটা কোড গেলে কুলডাউন।
    const { data: recent } = await admin
      .from('password_resets')
      .select('id, created_at')
      .eq('email', cleanEmail)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (recent) {
      const ageSeconds =
        (Date.now() - new Date(recent.created_at as string).getTime()) / 1000
      if (ageSeconds < RESEND_COOLDOWN_SECONDS) {
        return jsonResponse(
          {
            ok: false,
            error:
              'কোড ইতিমধ্যে পাঠানো হয়েছে — আবার পাঠাতে কিছুক্ষণ অপেক্ষা করুন।',
            retry_after: Math.ceil(RESEND_COOLDOWN_SECONDS - ageSeconds),
          },
          429,
        )
      }
    }

    const code = makeCode()
    const codeHash = await sha256Hex(code)
    const expiresAt = new Date(
      Date.now() + CODE_TTL_MINUTES * 60 * 1000,
    ).toISOString()

    // আগের অব্যবহৃত কোডগুলো বাতিল — একসঙ্গে একটাই সক্রিয় কোড।
    await admin
      .from('password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('email', cleanEmail)
      .is('used_at', null)

    const { error: insertError } = await admin.from('password_resets').insert({
      seller_id: (seller as { id: string }).id,
      email: cleanEmail,
      code_hash: codeHash,
      expires_at: expiresAt,
    })
    if (insertError) throw insertError

    const htmlContent = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;font-family:Arial,sans-serif;">
      <tr><td style="font-size:22px;font-weight:bold;">
        <span style="color:#006a4e;">Order</span><span style="color:#f42a41;">link</span>
      </td></tr>
      <tr><td style="padding-top:16px;font-size:15px;color:#222;">আপনার পাসওয়ার্ড রিসেট কোড:</td></tr>
      <tr><td align="center" style="padding:20px 0;">
        <span style="display:inline-block;background:#e6f4ef;color:#006a4e;font-size:32px;font-weight:bold;letter-spacing:8px;padding:12px 20px;border-radius:8px;">${code}</span>
      </td></tr>
      <tr><td style="font-size:14px;color:#555;">এই কোড ২০ মিনিটের মধ্যে ব্যবহার করুন। কোডটি কাউকে দেবেন না। আপনি রিসেট চাননি? তাহলে এই মেইল উপেক্ষা করুন।</td></tr>
    </table>
  </td></tr>
</table>`
    const textContent = `Orderlink — পাসওয়ার্ড রিসেট কোড\n\nআপনার কোড: ${code}\n\nএই কোড ২০ মিনিটের মধ্যে ব্যবহার করুন। কোডটি কাউকে দেবেন না।`

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: brevoSender, name: 'Orderlink' },
        to: [{ email: cleanEmail }],
        subject: 'Orderlink — পাসওয়ার্ড রিসেট কোড',
        htmlContent,
        textContent,
      }),
    })
    if (!brevoRes.ok) {
      // মেইল না গেলে কোডের সারি রোলব্যাক — "পাঠানো হয়েছে" বলে ভুল জানানো যাবে না।
      await admin
        .from('password_resets')
        .delete()
        .eq('email', cleanEmail)
        .eq('code_hash', codeHash)
      throw new Error(`Brevo মেইল পাঠাতে পারেনি (HTTP ${brevoRes.status})।`)
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    console.error('send-reset-code ভুল:', err)
    return jsonResponse(
      { ok: false, error: 'কোড পাঠানো যায়নি — আবার চেষ্টা করুন।' },
      500,
    )
  }
})
