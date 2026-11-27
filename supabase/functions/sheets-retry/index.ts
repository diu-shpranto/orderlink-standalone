// Supabase Edge Function: sheets-retry
// ব্যর্থ সিঙ্কগুলো আবার চালায় — কিউতে যেগুলোর সময় হয়েছে
// (next_retry_at পার হয়েছে) সেগুলো sync-order-কে ডেকে সিঙ্ক করে।
// সঙ্গে নিরাপত্তা জাল: কিউতে সারি নেই এমন pending/failed অর্ডার
// (যেমন মাইগ্রেশনের আগের অর্ডার) কিউতে বসিয়ে তারপর সিঙ্ক করে।
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Deploy: supabase functions deploy sheets-retry --no-verify-jwt
// (৩০ মিনিটের pg_cron থেকে ডাকা হয় — JWT যাচাই বন্ধ। ফাংশন কোনো
//  কাস্টমার তথ্য ফেরত দেয় না — শুধু সংখ্যা জানায়।)
// সেলারের "ব্যর্থ সিঙ্ক আবার চেষ্টা করুন" বোতামও এটাই ডাকে
// ({ seller_id, reset_attempts: true } দিয়ে)।

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const MAX_ATTEMPTS = 10
const BATCH_LIMIT = 50

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
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const body = (await req.json().catch(() => ({}))) as {
      seller_id?: string
      reset_attempts?: boolean
    }
    const sellerId =
      typeof body.seller_id === 'string' ? body.seller_id : null
    const resetAttempts = body.reset_attempts === true

    const nowIso = new Date().toISOString()

    // হাতে চাপা রিট্রাই: ব্যর্থ সারিগুলোর চেষ্টা-সংখ্যা শূন্য করে
    // এখনই চেষ্টার সময় বসানো হয় (১০ বারে থেমে যাওয়া সারিও ফেরে)।
    if (resetAttempts && sellerId) {
      await admin
        .from('sheet_sync_queue')
        .update({ attempts: 0, next_retry_at: nowIso })
        .eq('seller_id', sellerId)
        .eq('status', 'failed')
    }

    // নিরাপত্তা জাল: pending/failed অর্ডার অথচ কিউতে সারি নেই —
    // কিউতে বসানো হয় (মাইগ্রেশন 0004-এর trigger-এর আগের অর্ডার)।
    const { data: orphanOrders } = await admin
      .from('orders')
      .select('id, seller_id')
      .in('sheet_status', ['pending', 'failed'])
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT)
    for (const o of (orphanOrders ?? []) as {
      id: string
      seller_id: string
    }[]) {
      if (sellerId && o.seller_id !== sellerId) continue
      const { data: existing } = await admin
        .from('sheet_sync_queue')
        .select('id')
        .eq('order_id', o.id)
        .maybeSingle()
      if (!existing) {
        await admin.from('sheet_sync_queue').insert({
          seller_id: o.seller_id,
          order_id: o.id,
          status: 'pending',
        })
      }
    }

    // সময় হওয়া সারি: pending/failed (সময় পার হয়েছে) + মাঝপথে
    // আটকে থাকা processing (১০ মিনিটের বেশি পুরনো)।
    let query = admin
      .from('sheet_sync_queue')
      .select('id, order_id, seller_id, status, attempts, next_retry_at, updated_at')
      .or(
        `and(status.eq.pending,next_retry_at.lte.${nowIso}),and(status.eq.failed,next_retry_at.lte.${nowIso}),and(status.eq.processing,updated_at.lt.${new Date(Date.now() - 10 * 60 * 1000).toISOString()})`,
      )
      .order('next_retry_at', { ascending: true })
      .limit(BATCH_LIMIT)
    if (sellerId) query = query.eq('seller_id', sellerId)
    const { data: due } = await query
    const rows = ((due ?? []) as Record<string, unknown>[]).filter(
      (r) => Number(r.attempts ?? 0) < MAX_ATTEMPTS,
    )

    let synced = 0
    let failed = 0
    for (const row of rows) {
      try {
        const res = await fetch(
          `${supabaseUrl.replace(/\/$/, '')}/functions/v1/sync-order`,
          {
            method: 'POST',
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_id: row.order_id }),
          },
        )
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean
        }
        if (res.ok && data.ok) synced++
        else failed++
      } catch {
        failed++
      }
    }

    return jsonResponse({
      ok: true,
      processed: rows.length,
      synced,
      failed,
    })
  } catch (err) {
    console.error('sheets-retry ভুল:', err)
    return jsonResponse(
      { ok: false, error: 'রিট্রাই চালানো যায়নি — পরে আবার চেষ্টা হবে।' },
      500,
    )
  }
})
