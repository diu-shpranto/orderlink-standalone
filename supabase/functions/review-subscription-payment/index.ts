// Supabase Edge Function: review-subscription-payment
// TrxID পেমেন্ট অনুমোদন / বাতিল — Phase 6 অ্যাডমিন প্যানেলের
// সার্ভার-পাশের পথ। আসল কাজটা করে SECURITY DEFINER ফাংশন
// approve_subscription_payment / reject_subscription_payment
// (অনুমোদনে ৩০ দিনের মেয়াদ + রসিদ, সাসপেন্ড পেজ আবার চালু;
// বাতিলে কারণ লিখতেই হয়)।
//
// শুধু service-role key দিয়ে ডাকা যায় — Authorization হেডারে
// service-role key থাকতে হবে। লগইন করা সেলার এটা ডাকতে পারে না।
// Deploy: supabase functions deploy review-subscription-payment --no-verify-jwt
// (service-role key-ই অনুমোদন — JWT যাচাই বন্ধ।)

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

    // শুধু service-role key — এটাই অ্যাডমিনের প্রমাণ (Phase 6 পর্যন্ত)।
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token || token !== serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'অনুমোদন নেই।' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const body = (await req.json().catch(() => ({}))) as {
      payment_id?: unknown
      action?: unknown
      reason?: unknown
    }
    const paymentId =
      typeof body.payment_id === 'string' ? body.payment_id : ''
    const action = typeof body.action === 'string' ? body.action : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

    if (!paymentId) {
      return jsonResponse({ ok: false, error: 'payment_id লাগবে।' }, 400)
    }
    if (action !== 'approve' && action !== 'reject') {
      return jsonResponse(
        { ok: false, error: "action 'approve' বা 'reject' হতে হবে।" },
        400,
      )
    }
    if (action === 'reject' && !reason) {
      return jsonResponse({ ok: false, error: 'বাতিলের কারণ লিখতেই হবে।' }, 400)
    }

    if (action === 'approve') {
      const { data, error } = await admin.rpc('approve_subscription_payment', {
        p_payment_id: paymentId,
      })
      if (error) {
        return jsonResponse(
          { ok: false, error: error.message || 'অনুমোদন করা যায়নি।' },
          400,
        )
      }
      return jsonResponse({
        ok: true,
        status: 'approved',
        receipt_code: data as string,
      })
    }

    const { error } = await admin.rpc('reject_subscription_payment', {
      p_payment_id: paymentId,
      p_reason: reason,
    })
    if (error) {
      return jsonResponse(
        { ok: false, error: error.message || 'বাতিল করা যায়নি।' },
        400,
      )
    }
    return jsonResponse({ ok: true, status: 'rejected' })
  } catch (err) {
    console.error('review-subscription-payment ভুল:', err)
    return jsonResponse(
      { ok: false, error: 'যাচাই করা যায়নি — আবার চেষ্টা করুন।' },
      500,
    )
  }
})
