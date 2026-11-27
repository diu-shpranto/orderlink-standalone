// অর্ডার — ফর্মের হিসাব, জমা দেওয়া, সেলারের অর্ডার ব্যবস্থাপনা।
// অর্ডারই সত্যের উৎস (Supabase orders টেবিল); Sheet সিঙ্ক Phase 4-এ
// বানানো — অর্ডার জমলেই triggerOrderSync (lib/sheets.ts) ফায়ার-
// অ্যান্ড-ফরগেট ডাকা হয়, সিঙ্ক ব্যর্থ হলেও অর্ডার আটকায় না।

import { requireSupabase } from './supabase.ts'
import { todayDhaka } from './pricing.ts'
import type {
  OrderEventRow,
  OrderRow,
  ProductRow,
  ShopRow,
} from './types.ts'

// ---------- বিভাগ ও জেলা (বাংলাদেশের ৮ বিভাগ, ৬৪ জেলা) ----------

export const DIVISIONS: string[] = [
  'ঢাকা',
  'চট্টগ্রাম',
  'খুলনা',
  'রাজশাহী',
  'বরিশাল',
  'সিলেট',
  'রংপুর',
  'ময়মনসিংহ',
]

export const DIVISION_DISTRICTS: Record<string, string[]> = {
  'ঢাকা': [
    'ঢাকা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'টাঙ্গাইল', 'কিশোরগঞ্জ',
    'মানিকগঞ্জ', 'মুন্সিগঞ্জ', 'নরসিংদী', 'ফরিদপুর', 'গোপালগঞ্জ',
    'মাদারীপুর', 'রাজবাড়ী', 'শরীয়তপুর',
  ],
  'চট্টগ্রাম': [
    'চট্টগ্রাম', 'কক্সবাজার', 'কুমিল্লা', 'ব্রাহ্মণবাড়িয়া', 'চাঁদপুর',
    'লক্ষ্মীপুর', 'নোয়াখালী', 'ফেনী', 'খাগড়াছড়ি', 'রাঙ্গামাটি',
    'বান্দরবান',
  ],
  'খুলনা': [
    'খুলনা', 'যশোর', 'সাতক্ষীরা', 'বাগেরহাট', 'নড়াইল', 'মাগুরা',
    'ঝিনাইদহ', 'চুয়াডাঙ্গা', 'কুষ্টিয়া', 'মেহেরপুর',
  ],
  'রাজশাহী': [
    'রাজশাহী', 'বগুড়া', 'পাবনা', 'সিরাজগঞ্জ', 'নওগাঁ', 'নাটোর',
    'জয়পুরহাট', 'চাঁপাইনবাবগঞ্জ',
  ],
  'বরিশাল': [
    'বরিশাল', 'ভোলা', 'পটুয়াখালী', 'পিরোজপুর', 'বরগুনা', 'ঝালকাঠি',
  ],
  'সিলেট': ['সিলেট', 'মৌলভীবাজার', 'হবিগঞ্জ', 'সুনামগঞ্জ'],
  'রংপুর': [
    'রংপুর', 'দিনাজপুর', 'ঠাকুরগাঁও', 'পঞ্চগড়', 'নীলফামারী',
    'লালমনিরহাট', 'কুড়িগ্রাম', 'গাইবান্ধা',
  ],
  'ময়মনসিংহ': ['ময়মনসিংহ', 'জামালপুর', 'শেরপুর', 'নেত্রকোণা'],
}

// ---------- ফোন নম্বর ----------

// 01… / 8801… / +8801… — সবই চলে; জমা হয় 01XXXXXXXXX আকারে।
export function normalizePhoneBD(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('8801')) {
    return `0${digits.slice(3)}`
  }
  if (digits.length === 11 && digits.startsWith('01')) return digits
  if (digits.length === 10 && digits.startsWith('1')) return `0${digits}`
  return null
}

export function isValidPhoneBD(normalized: string | null): boolean {
  return normalized !== null && /^01[3-9]\d{8}$/.test(normalized)
}

// ---------- দাম ও ডেলিভারি চার্জ ----------

export function deliveryChargeFor(
  shop: ShopRow,
  area: 'inside' | 'outside',
  subtotal: number,
): number {
  // ফ্রি-ডেলিভারি সীমা থাকলে আর পণ্যের মোট সীমা ছাড়ালে চার্জ ০।
  if (
    shop.free_delivery_threshold !== null &&
    shop.free_delivery_threshold > 0 &&
    subtotal >= shop.free_delivery_threshold
  ) {
    return 0
  }
  return area === 'inside'
    ? Number(shop.delivery_inside_charge)
    : Number(shop.delivery_outside_charge)
}

export function orderTotal(
  unitPrice: number,
  quantity: number,
  deliveryCharge: number,
): number {
  return Math.round((unitPrice * quantity + deliveryCharge) * 100) / 100
}

// ---------- অর্ডার জমা (কাস্টমার — লগইন লাগে না) ----------

export interface PlaceOrderInput {
  shop: ShopRow
  product: ProductRow
  customerName: string
  customerPhone: string
  division: string
  district: string
  upazila: string
  addressLine: string
  deliveryArea: 'inside' | 'outside'
  quantity: number
}

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<{ id: string; orderCode: string }> {
  const client = requireSupabase()
  const subtotal = Number(input.product.price) * input.quantity
  const deliveryCharge = deliveryChargeFor(
    input.shop,
    input.deliveryArea,
    subtotal,
  )
  const total = orderTotal(
    Number(input.product.price),
    input.quantity,
    deliveryCharge,
  )
  // order_code দেওয়া হয় না — ডাটাবেসের trigger OL-1001… বসিয়ে দেয়।
  const { data, error } = await client
    .from('orders')
    .insert({
      seller_id: input.shop.seller_id,
      shop_id: input.shop.id,
      product_id: input.product.id,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone,
      division: input.division,
      district: input.district,
      upazila: input.upazila || null,
      address_line: input.addressLine.trim(),
      delivery_area: input.deliveryArea,
      delivery_charge: deliveryCharge,
      quantity: input.quantity,
      total,
      status: 'new',
      sheet_status: 'pending',
    })
    .select('id, order_code')
    .single()
  if (error) throw error
  const row = data as { id: string; order_code: string }
  return { id: row.id, orderCode: row.order_code }
}

// একই ফোনে গত ২৪ ঘণ্টায় এই দোকানে অর্ডার আছে কি না (ডুপ্লিকেট সতর্কতা)।
// কাস্টমার লগইন ছাড়া অর্ডার দেয় বলে সরাসরি orders পড়া যায় না (RLS) —
// তাই ডাটাবেসের check_recent_order ফাংশন (SECURITY DEFINER) ব্যবহার হয়,
// যেটা শুধু অর্ডার কোডটাই ফেরত দেয়, কাস্টমারের আর কোনো তথ্য নয়।
export async function findRecentOrderByPhone(
  shopId: string,
  phone: string,
): Promise<{ orderCode: string; createdAt: string } | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('check_recent_order', {
    p_shop_id: shopId,
    p_phone: phone,
  })
  if (error) throw error
  const rows = (data ?? []) as { order_code: string; created_at: string }[]
  if (rows.length === 0) return null
  return { orderCode: rows[0].order_code, createdAt: rows[0].created_at }
}

// ---------- স্ট্যাটাস পরিবর্তনের নিয়ম ----------

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: 'confirmed',
  confirmed: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
}

export function canTransition(
  from: string,
  to: string,
): to is OrderStatus {
  if (to === 'cancelled') {
    return (
      from === 'new' ||
      from === 'confirmed' ||
      from === 'processing' ||
      from === 'shipped'
    )
  }
  return NEXT_STATUS[from as OrderStatus] === to
}

// ---------- সেলারের অর্ডার (শুধু নিজের) ----------

export interface OrderFilters {
  search: string
  status: string // 'all' বা স্ট্যাটাস
  productId: string // 'all' বা প্রোডাক্ট id
  dateFrom: string // YYYY-MM-DD বা ''
  dateTo: string // YYYY-MM-DD বা ''
}

export async function fetchSellerOrders(
  sellerId: string,
): Promise<OrderRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as OrderRow[]
}

export function filterOrders(
  orders: OrderRow[],
  filters: OrderFilters,
): OrderRow[] {
  const q = filters.search.trim().toLowerCase()
  return orders.filter((o) => {
    if (filters.status !== 'all' && o.status !== filters.status) return false
    if (filters.productId !== 'all' && o.product_id !== filters.productId) {
      return false
    }
    if (filters.dateFrom && o.created_at.slice(0, 10) < filters.dateFrom) {
      return false
    }
    if (filters.dateTo && o.created_at.slice(0, 10) > filters.dateTo) {
      return false
    }
    if (q) {
      const hay = `${o.order_code} ${o.customer_name} ${o.customer_phone}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export interface OrderStats {
  total: number
  newCount: number
  todayOrders: number
  todaySales: number
  delivered: number
  cancelled: number
}

export function computeOrderStats(orders: OrderRow[]): OrderStats {
  const today = todayDhaka()
  const nonCancelled = (o: OrderRow) => o.status !== 'cancelled'
  return {
    total: orders.length,
    newCount: orders.filter((o) => o.status === 'new').length,
    todayOrders: orders.filter((o) => o.created_at.slice(0, 10) === today)
      .length,
    todaySales: orders
      .filter((o) => o.created_at.slice(0, 10) === today && nonCancelled(o))
      .reduce((sum, o) => sum + Number(o.total), 0),
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }
}

export async function fetchOrderEvents(
  orderId: string,
): Promise<OrderEventRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('order_events')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as OrderEventRow[]
}

export async function updateOrderStatus(
  order: OrderRow,
  to: OrderStatus,
): Promise<void> {
  if (!canTransition(order.status, to)) {
    throw new Error('এই স্ট্যাটাস থেকে এভাবে বদলানো যাবে না।')
  }
  const client = requireSupabase()
  const { error } = await client
    .from('orders')
    .update({ status: to })
    .eq('id', order.id)
    .eq('seller_id', order.seller_id)
  if (error) throw error
  // স্ট্যাটাসের ইতিহাস ডাটাবেসের trigger (orders_log_status_change) লেখে।
}

export async function updateOrderNotes(
  order: OrderRow,
  notes: string,
): Promise<void> {
  const client = requireSupabase()
  const { error } = await client
    .from('orders')
    .update({ internal_notes: notes })
    .eq('id', order.id)
    .eq('seller_id', order.seller_id)
  if (error) throw error
}

// একই ফোনে এই দোকানের আর কতগুলো অর্ডার আছে (বিস্তারিত ভিউয়ে সতর্কতা)।
export function countOrdersByPhone(
  orders: OrderRow[],
  phone: string,
): number {
  return orders.filter((o) => o.customer_phone === phone).length
}
