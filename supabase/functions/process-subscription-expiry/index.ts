// Supabase Edge Function: process-subscription-expiry
// প্রতিদিন চলে (pg_cron → এই ফাংশন → SQL ফাংশন
// process_subscription_expiry): মেয়াদ শেষ হলে গ্রেস শুরু,
// গ্রেস শেষ হলে ফ্রি সার্ভিস (শুধু ১টি পেজ চালু, বাকি সাসপেন্ড)।
// কোনো কাস্টমার তথ্য ফেরত দেয় না — শুধু সংখ্যা জানায়।
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Deploy: supabase functions deploy process-subscription-expiry --no-verify-jwt
// (pg_cron থেকে ডাকা হয় — JWT যাচাই বন্ধ, sheets-retry-এর মতো।)

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
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await admin.rpc('process_subscription_expiry')
    if (error) {
      return jsonResponse(
        { ok: false, error: error.message || 'মেয়াদ যাচাই করা যায়নি।' },
        500,
      )
    }
    const summary = (data ?? {}) as {
      grace_started?: number
      expired?: number
      pages_suspended?: number
    }
    return jsonResponse({
      ok: true,
      grace_started: summary.grace_started ?? 0,
      expired: summary.expired ?? 0,
      pages_suspended: summary.pages_suspended ?? 0,
    })
  } catch (err) {
    console.error('process-subscription-expiry ভুল:', err)
    return jsonResponse(
      { ok: false, error: 'মেয়াদ যাচাই করা যায়নি — পরে আবার চেষ্টা হবে।' },
      500,
    )
  }
})
