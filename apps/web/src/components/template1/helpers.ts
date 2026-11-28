// টেমপ্লেট ১-এর ছোট সহায়ক — বাংলা সংখ্যা, দাম, ফোন লিংক,
// কিবোর্ড ফোকাসের আউটলাইন। রেফারেন্স ডিজাইনের মতো ৳ সংখ্যার
// আগে বসে (অ্যাপের formatBDT-র ৳ পরে বসে — এটা শুধু এই
// টেমপ্লেটের চেহারা মেলাতে)।
import { toBnDigits } from '../../lib/pricing.ts'

/** সংখ্যা বাংলায় — 1490 → "১,৪৯০"। */
export function bn(value: number): string {
  return value.toLocaleString('bn-BD')
}

/** দাম বাংলায় — 1490 → "৳১,৪৯০"। */
export function bdt(amount: number): string {
  return `৳${bn(Math.round(amount))}`
}

/** দেখানোর ফোন নম্বর — 8801712345678 → "০১৭১২৩৪৫৬৭৮",
    01712345678 → "০১৭১২৩৪৫৬৭৮"। */
export function displayPhone(phone: string): string {
  const local = phone.startsWith('880') ? `0${phone.slice(3)}` : phone
  return toBnDigits(local)
}

/** tel: লিংক — 880... → tel:+880..., 01... → tel:+8801...। */
export function telHref(phone: string): string {
  if (phone.startsWith('+')) return `tel:${phone}`
  if (phone.startsWith('880')) return `tel:+${phone}`
  if (phone.startsWith('0')) return `tel:+88${phone}`
  return `tel:${phone}`
}

/** কিবোর্ড ফোকাসে দেখা যায় এমন আউটলাইন (রেফারেন্সের সবুজ রিং)। */
export const FOCUS_RING =
  'focus:outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#7FC4A0]'
