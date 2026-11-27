// Supabase client — শুধু env ভেরিয়েবল থেকে (VITE_SUPABASE_URL,
// VITE_SUPABASE_ANON_KEY)। আসল মান কখনো কোডে বসে না।
// .env না থাকলে (যেমন নতুন ক্লোনে) অ্যাপ ক্র্যাশ করবে না —
// supabaseConfigured false থাকবে, আর UI সেটআপের নির্দেশনা দেখাবে।
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null

// Supabase লাগবে এমন জায়গায় ব্যবহারের জন্য — কনফিগ না থাকলে
// বাংলায় পরিষ্কার ভুল দেবে।
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase কনফিগার করা হয়নি — apps/web/.env-এ VITE_SUPABASE_URL ও VITE_SUPABASE_ANON_KEY বসান (দেখুন docs/setup.md)।',
    )
  }
  return supabase
}

// Edge Functions-এর ঠিকানা (পাসওয়ার্ড রিসেটের কোড পাঠানো/যাচাই)।
export function functionsUrl(functionName: string): string {
  if (!supabaseUrl) {
    throw new Error('Supabase URL কনফিগার করা হয়নি।')
  }
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`
}

// Edge Functions ডাকার সময় anon key হেডার (public ফাংশন হলেও লাগে)।
export function anonKeyHeader(): Record<string, string> {
  if (!supabaseAnonKey) {
    throw new Error('Supabase anon key কনফিগার করা হয়নি।')
  }
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  }
}
