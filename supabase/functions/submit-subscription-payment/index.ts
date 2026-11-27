// Supabase Edge Function: submit-subscription-payment
// সেলার প্যাকেজ কিনতে TrxID পেমেন্ট জমা দেয় — অনুমোদনের আগে
// কিছুই চালু হয় না। টাকা প্যাকেজের দাম থেকে সার্ভারেই বসে;
// TrxID বড় হাতের + ছাঁটা আকারে যায়; pending বা approved
// অবস্থায় একই TrxID দুবার জমা হবে না।
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Deploy: supabase functions deploy submit-subscription-payment
// (JWT যাচাই চালু — শুধু লগইন করা সেলার নিজের পেমেন্ট জমা দিতে পারে।)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const METHODS = ['bkash', 'nagad', 'upay'] as const
type Method = (typeof METHODS)[number]

const METHOD_SETTING: Record<Method, string> = {
  bkash: 'payment_bkash_number',
  nagad: 'payment_nagad_number',
  upay: 'payment_upay_number',
}

const METHOD_BN: Record<Method, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  upay: 'Upay',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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
    const { data: userData, error: userError } = await admin.auth.getUser(jwt)
    if (userError || !userData.user) {
      return jsonResponse({ ok: false, error: 'লগইন করা নেই।' }, 401)
    }
    const sellerId = userData.user.id

    // সেলারের দোকান আছে কি — না থাকলে আগে সেটআপ করতে হবে।
    const { data: seller } = await admin
      .from('sellers')
      .select('id')
      .eq('id', sellerId)
      .maybeSingle()
    if (!seller) {
      return jsonResponse(
        { ok: false, error: 'আগে দোকান সেটআপ করুন — তারপর প্যাকেজ কিনতে পারবেন।' },
        400,
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      plan_id?: unknown
      method?: unknown
      trxid?: unknown
      sender_number?: unknown
    }
    const planId = typeof body.plan_id === 'string' ? body.plan_id : ''
    const method = typeof body.method === 'string' ? body.method : ''
    const trxid =
      typeof body.trxid === 'string' ? body.trxid.trim().toUpperCase() : ''
    const senderNumber =
      typeof body.sender_number === 'string' ? body.sender_number.trim() : ''

    if (!planId) {
      return jsonResponse({ ok: false, error: 'প্যাকেজ বাছুন।' }, 400)
    }
    if (!(METHODS as readonly string[]).includes(method)) {
      return jsonResponse({ ok: false, error: 'পেমেন্টের মাধ্যম বাছুন।' }, 400)
    }
    if (!trxid) {
      return jsonResponse({ ok: false, error: 'TrxID দিন।' }, 400)
    }
    if (!senderNumber) {
      return jsonResponse({ ok: false, error: 'যে নম্বর থেকে টাকা পাঠিয়েছেন সেটা দিন।' }, 400)
    }
    const senderDigits = senderNumber.replace(/[\s\-+]/g, '')
    if (!/^\d{10,14}$/.test(senderDigits)) {
      return jsonResponse(
        { ok: false, error: 'পাঠানো নম্বরটি সঠিক নয় — ১০ থেকে ১৪ সংখ্যার নম্বর দিন।' },
        400,
      )
    }

    // প্যাকেজ — দাম সবসময় সার্ভারের ক্যাটালগ থেকে।
    const { data: plan } = await admin
      .from('subscription_plans')
      .select('id, price_bdt, is_active')
      .eq('id', planId)
      .maybeSingle()
    if (!plan || !(plan as { is_active: boolean }).is_active) {
      return jsonResponse({ ok: false, error: 'প্যাকেজটি আর চালু নেই।' }, 400)
    }
    const price = Number((plan as { price_bdt: number }).price_bdt)

    // এই মাধ্যমে পেমেন্টের নম্বর অ্যাডমিন বসিয়েছে কি?
    const { data: setting } = await admin
      .from('platform_settings')
      .select('value')
      .eq('key', METHOD_SETTING[method as Method])
      .maybeSingle()
    const paymentNumber = ((setting as { value?: string } | null)?.value ?? '').trim()
    if (!paymentNumber) {
      return jsonResponse(
        {
          ok: false,
          error: `${METHOD_BN[method as Method]} পেমেন্ট এখনো চালু হয়নি — অ্যাডমিন পেমেন্টের নম্বর বসাননি।`,
        },
        400,
      )
    }

    // একই TrxID pending বা approved অবস্থায় থাকলে আর জমা হবে না।
    const { data: existing } = await admin
      .from('subscription_payments')
      .select('id')
      .eq('trxid', trxid)
      .in('status', ['pending', 'approved'])
      .maybeSingle()
    if (existing) {
      return jsonResponse(
        {
          ok: false,
          error: 'এই TrxID দিয়ে আগেই একটি পেমেন্ট জমা আছে — যাচাই শেষ হলে জানানো হবে।',
        },
        409,
      )
    }

    const { data: inserted, error: insertError } = await admin
      .from('subscription_payments')
      .insert({
        seller_id: sellerId,
        plan_id: planId,
        method,
        trxid,
        amount_bdt: price,
        sender_number: senderNumber,
        status: 'pending',
      })
      .select('id')
      .single()
    if (insertError || !inserted) {
      // ডাটাবেসের unique index-ও একই ডুপ্লিকেট আটকায় (23505)।
      if ((insertError as { code?: string } | null)?.code === '23505') {
        return jsonResponse(
          {
            ok: false,
            error: 'এই TrxID দিয়ে আগেই একটি পেমেন্ট জমা আছে — যাচাই শেষ হলে জানানো হবে।',
          },
          409,
        )
      }
      return jsonResponse({ ok: false, error: 'পেমেন্ট জমা করা যায়নি — আবার চেষ্টা করুন।' }, 500)
    }

    return jsonResponse({
      ok: true,
      payment_id: (inserted as { id: string }).id,
      plan_id: planId,
      method,
      amount_bdt: price,
      payment_number: paymentNumber,
    })
  } catch (err) {
    console.error('submit-subscription-payment ভুল:', err)
    return jsonResponse(
      { ok: false, error: 'পেমেন্ট জমা করা যায়নি — আবার চেষ্টা করুন।' },
      500,
    )
  }
})
