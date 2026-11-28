// টেমপ্লেট ১-এর অর্ডার জমা — আপাতত MOCK। 700ms অপেক্ষা করে
// সফল হয়। পরে এখানেই আসল Supabase + Google Sheets সংযোগ
// বসবে; UI-এর কোনো ফাইলে হাত দিতে হবে না।
// সাবধান: এটা আসল lib/orders.ts-এর placeOrder নয় —
// এটা শুধু টেমপ্লেটের প্রিভিউ/ডেমো জমা।

export type DeliveryArea = 'inside' | 'outside'

export interface TemplateOneOrder {
  productName: string
  customerName: string
  customerPhone: string
  address: string
  deliveryArea: DeliveryArea
  deliveryCharge: number
  quantity: number
  total: number
}

export function submitOrder(
  _order: TemplateOneOrder,
): Promise<{ ok: true }> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve({ ok: true }), 700)
  })
}
