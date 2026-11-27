// Supabase Edge Function: sheets-disconnect
// সেলারের Google Sheet সংযোগ ছিন্ন করে — টোকেন ও Sheet লিংক মুছে
// যায়; Sheet-এর ভেতরের সারি থেকে যায়, Sheet নিজে কখনো মোছা হয় না।
// বাকি থাকা সিঙ্কগুলো skipped হয়ে যায়।
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Deploy: supabase functions deploy sheets-disconnect
// (JWT যাচাই চালু — শুধু লগইন করা সেলার নিজের সংযোগ ছিন্ন করতে পারে।)

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

    // টোকেন + Sheet লিংক মুছে যায়। Sheet-এর ভেতরের সারি থেকে যায়।
    await admin
      .from('seller_google_tokens')
      .delete()
      .eq('seller_id', sellerId)
    await admin
      .from('sheet_sync_queue')
      .update({ status: 'skipped', last_error: 'Google সংযোগ ছিন্ন করা হয়েছে।' })
      .eq('seller_id', sellerId)
      .in('status', ['pending', 'failed'])
    await admin
      .from('orders')
      .update({ sheet_status: 'not_connected' })
      .eq('seller_id', sellerId)
      .in('sheet_status', ['pending', 'failed'])

    return jsonResponse({ ok: true })
  } catch (err) {
    console.error('sheets-disconnect ভুল:', err)
    return jsonResponse(
      { ok: false, error: 'সংযোগ ছিন্ন করা যায়নি — আবার চেষ্টা করুন।' },
      500,
    )
  }
})
