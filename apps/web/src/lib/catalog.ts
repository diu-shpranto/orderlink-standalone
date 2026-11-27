// সাবস্ক্রিপশন প্যাকেজের ক্যাটালগ — আপাতত লোকাল কপি।
// দাম ও সীমা পরিকল্পনার অনুমোদিত মডেল (একটাই মাসিক সাবস্ক্রিপশন)।
// Phase 5-এ সার্ভারের লাইভ ক্যাটালগ (subscription_plans) থেকে আসবে;
// তখন এই ফাইল শুধু ফলব্যাক থাকবে। কোনো পেজ ক্রেডিট, আলাদা হোস্টিং
// ফি, অর্ডারপ্রতি চার্জ বা কমিশন নেই।

export interface PackagePlan {
  id: 'starter' | 'basic' | 'growth' | 'business'
  nameBn: string
  price: number
  pages: number
  storageMb: number
  recommended: boolean
  featuresBn: string[]
}

export const PACKAGES: PackagePlan[] = [
  {
    id: 'starter',
    nameBn: 'Starter',
    price: 99,
    pages: 3,
    storageMb: 100,
    recommended: false,
    featuresBn: ['৩টি ল্যান্ডিং পেজ', '১০০ MB ছবির স্টোরেজ', 'Google Sheet অটো-সিঙ্ক'],
  },
  {
    id: 'basic',
    nameBn: 'Basic',
    price: 199,
    pages: 5,
    storageMb: 250,
    recommended: false,
    featuresBn: ['৫টি ল্যান্ডিং পেজ', '২৫০ MB ছবির স্টোরেজ', 'Google Sheet অটো-সিঙ্ক'],
  },
  {
    id: 'growth',
    nameBn: 'Growth',
    price: 399,
    pages: 10,
    storageMb: 500,
    recommended: true,
    featuresBn: ['১০টি ল্যান্ডিং পেজ', '৫০০ MB ছবির স্টোরেজ', 'Google Sheet অটো-সিঙ্ক'],
  },
  {
    id: 'business',
    nameBn: 'Business',
    price: 699,
    pages: 20,
    storageMb: 1024,
    recommended: false,
    featuresBn: ['২০টি ল্যান্ডিং পেজ', '১ GB ছবির স্টোরেজ', 'Google Sheet অটো-সিঙ্ক'],
  },
]

export function storageLabel(mb: number): string {
  return mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`
}
