// সাবস্ক্রিপশন প্যাকেজের ক্যাটালগ — শুধু টাইপ আর দেখানোর সহায়ক।
// দাম ও সীমা সার্ভারের ক্যাটালগ (subscription_plans) থেকে আসে
// (দেখুন lib/subscription.ts) — এখানে কোনো দাম হার্ডকোড করা নেই।

export function storageLabel(mb: number): string {
  return mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`
}
