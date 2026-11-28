// টেমপ্লেট ২-এর ছোট সহায়ক — বাংলা সংখ্যা, দাম, ফোন/WhatsApp
// লিংক, ডেলিভারি চার্জের নিয়ম, কিবোর্ড ফোকাসের আউটলাইন।
import { toBnDigits } from '../../lib/pricing.ts'

import type { DeliveryArea } from './types.ts'

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

/** WhatsApp লিংক — 880... / 01... → wa.me/880...। */
export function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.startsWith('880')
    ? digits
    : digits.startsWith('0')
      ? `88${digits}`
      : digits
  return `https://wa.me/${normalized}`
}

/** কার্যকর ডেলিভারি চার্জ — lib/orders.ts-এর deliveryChargeFor-এর
    নিয়মেরই আয়না: ফ্রি-ডেলিভারি সীমা থাকলে আর পণ্যের মোট সেই
    সীমা ছাড়ালে চার্জ ০, নইলে এলাকা অনুযায়ী চার্জ। */
export function effectiveDeliveryCharge(
  inside: number,
  outside: number,
  freeDeliveryThreshold: number | null | undefined,
  subtotal: number,
  area: DeliveryArea,
): number {
  if (
    freeDeliveryThreshold !== null &&
    freeDeliveryThreshold !== undefined &&
    freeDeliveryThreshold > 0 &&
    subtotal >= freeDeliveryThreshold
  ) {
    return 0
  }
  return area === 'inside' ? inside : outside
}

/** কিবোর্ড ফোকাসে দেখা যায় এমন আউটলাইন (অ্যাকসেন্ট সবুজ রিং)। */
export const FOCUS_RING =
  'focus:outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#294C3C]'
