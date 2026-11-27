// দাম, ছাড় ও সংখ্যার হিসাব — সব জায়গায় একই নিয়ম।
// ছাড়ের শতাংশ সবসময় অটো-হিসাব (পুরনো দাম ও দাম থেকে); হাতে বসানো যায় না।
// দাম ও সংখ্যা বাংলায় দেখানো হয় (লাইভ অ্যাপের মতো); অর্ডার কোড/ফোন লাতিন সংখ্যায়।

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)])
}

export function formatBDT(amount: number): string {
  const rounded = Math.round(amount)
  return `৳${toBnDigits(rounded.toLocaleString('en-US'))}`
}

export function formatCountBn(n: number): string {
  return toBnDigits(n.toLocaleString('en-US'))
}

// ছাড়ের শতাংশ: পুরনো দাম থাকলে ও দামের চেয়ে বড় হলেই হিসাব হয়।
export function discountPercent(
  price: number,
  oldPrice: number | null,
): number {
  if (!oldPrice || oldPrice <= 0 || oldPrice <= price) return 0
  return Math.round(((oldPrice - price) / oldPrice) * 100)
}

// লিংকের নাম (slug) বানানো — ছোট হাতের ইংরেজি, সংখ্যা, হাইফেন।
export function slugify(text: string, maxLength = 60): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

// আজকের তারিখ (Asia/Dhaka) — "YYYY-MM-DD" আকারে।
export function todayDhaka(): string {
  return new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
    .slice(0, 10)
}

export function daysAgoDhaka(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return d
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
    .slice(0, 10)
}
