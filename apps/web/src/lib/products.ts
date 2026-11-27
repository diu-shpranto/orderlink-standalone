// প্রোডাক্ট / পেজ / ছবি / ড্যাশবোর্ডের ডাটা — Supabase (anon key) দিয়ে।
// আসল মান কখনো কোডে নেই; সব env থেকে। RLS-ই মালিকানা ঠিক রাখে।

import { requireSupabase } from './supabase.ts'
import type {
  CustomerPageData,
  FaqItem,
  OrderRow,
  PageRow,
  ProductImageRow,
  ProductRow,
  ReviewItem,
  ShopRow,
  TemplateId,
} from './types.ts'
import type { PageLang } from './types.ts'
import { daysAgoDhaka, slugify, todayDhaka } from './pricing.ts'
import { canPublishPage } from './subscription.ts'

export const PRODUCT_IMAGES_BUCKET = 'product-images'
export const MAX_IMAGES_PER_PRODUCT = 8

function asShop(row: unknown): ShopRow {
  return row as ShopRow
}
function asProduct(row: unknown): ProductRow {
  return row as ProductRow
}
function asPage(row: unknown): PageRow {
  return row as PageRow
}
function asImage(row: unknown): ProductImageRow {
  return row as ProductImageRow
}
function asOrder(row: unknown): OrderRow {
  return row as OrderRow
}

// ---------- দোকান ও কাস্টমার পেজ পড়া (পাবলিক) ----------

export async function fetchShopBySlug(slug: string): Promise<ShopRow | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data ? asShop(data) : null
}

// সেলারের WhatsApp নম্বর — পাবলিক পেজে দেখানোর জন্য। sellers
// টেবিল সরাসরি পড়া লগইন ছাড়া RLS-এ আটকায় (sellers_owner_select),
// তাই মাইগ্রেশন 0007-এর get_seller_whatsapp ফাংশন ব্যবহার হয় —
// ওটা শুধু নম্বরটাই ফেরত দেয়, সেলারের আর কোনো তথ্য নয়। ফাংশন
// এখনো লাইভে না থাকলে পুরনো পথে চেষ্টা (লগইন করা সেলারের
// প্রিভিউতে এটা চলে; লগইন ছাড়া আগের মতোই null আসে)।
// কখনো throw করে না — না পেলে null।
async function fetchSellerWhatsapp(
  client: ReturnType<typeof requireSupabase>,
  shopSlug: string,
  sellerId?: string,
): Promise<string | null> {
  const { data: whatsappData, error: whatsappError } = await client.rpc(
    'get_seller_whatsapp',
    { p_shop_slug: shopSlug },
  )
  if (!whatsappError) {
    return typeof whatsappData === 'string' ? whatsappData : null
  }
  if (!sellerId) return null
  const { data: sellerData } = await client
    .from('sellers')
    .select('whatsapp')
    .eq('id', sellerId)
    .maybeSingle()
  return (sellerData as { whatsapp: string | null } | null)?.whatsapp ?? null
}

// আগের পরপর-পড়া পথ (দোকান → পেজ → প্রোডাক্ট → ছবি → WhatsApp) —
// এমবেডেড কোয়েরি কোনো কারণে না চললে ফলব্যাক হিসেবে রাখা আছে;
// ফলাফল হুবহু একই, শুধু ধীর।
async function fetchCustomerPageSequential(
  client: ReturnType<typeof requireSupabase>,
  shopSlug: string,
  productSlug: string,
): Promise<CustomerPageData | null> {
  const shop = await fetchShopBySlug(shopSlug)
  if (!shop) return null
  const { data: pageData, error: pageError } = await client
    .from('pages')
    .select('*')
    .eq('shop_id', shop.id)
    .eq('slug', productSlug)
    .maybeSingle()
  if (pageError) throw pageError
  if (!pageData) return null
  const page = asPage(pageData)
  const { data: productData, error: productError } = await client
    .from('products')
    .select('*')
    .eq('id', page.product_id)
    .maybeSingle()
  if (productError) throw productError
  if (!productData) return null
  const { data: imageData, error: imageError } = await client
    .from('product_images')
    .select('*')
    .eq('product_id', page.product_id)
    .order('sort_order', { ascending: true })
  if (imageError) throw imageError
  const sellerWhatsapp = await fetchSellerWhatsapp(
    client,
    shopSlug,
    shop.seller_id,
  )
  return {
    shop,
    product: asProduct(productData),
    images: (imageData ?? []).map(asImage),
    page,
    sellerWhatsapp,
  }
}

export async function fetchCustomerPage(
  shopSlug: string,
  productSlug: string,
): Promise<CustomerPageData | null> {
  const client = requireSupabase()
  // WhatsApp নম্বর শুধু দোকানের slug দিয়েই আনা যায়, তাই ডাটা
  // কোয়েরির সাথে সমান্তরালে চালানো হয় (আগে এটা চেইনের শেষে বসত)।
  const whatsappPromise = fetchSellerWhatsapp(client, shopSlug)
  try {
    // একটাই কোয়েরি: পেজ + দোকান + প্রোডাক্ট + ছবি — PostgREST
    // এমবেডিং। আগে এগুলো ৫টা আলাদা রাউন্ড-ট্রিপে পরপর আসত
    // (প্রতিটা ২৫০–১৫০০ মিলিসেকেন্ড) — সেটাই "লোড হচ্ছে…"-র মূল
    // কারণ ছিল। ফলাফলের আকৃতি আগের মতোই রাখা হয়েছে।
    const { data, error } = await client
      .from('pages')
      .select(
        '*,shop:shops!inner(*),product:products(*,images:product_images(*))',
      )
      .eq('shop.slug', shopSlug)
      .eq('slug', productSlug)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const row = data as unknown as PageRow & {
      shop: ShopRow
      product:
        | (ProductRow & { images?: ProductImageRow[] })
        | null
    }
    if (!row.product) return null
    const sellerWhatsapp = await whatsappPromise
    const { images: embeddedImages, ...productRest } = row.product
    const images = [...(embeddedImages ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(asImage)
    const { shop, product: _product, ...pageRest } = row
    return {
      shop: asShop(shop),
      product: asProduct(productRest),
      images,
      page: asPage(pageRest),
      sellerWhatsapp,
    }
  } catch {
    // এমবেডেড কোয়েরি না চললে আগের পথে ফিরে যাওয়া।
    return fetchCustomerPageSequential(client, shopSlug, productSlug)
  }
}

// পুরনো /p/<slug> লিংক — নতুন /<shop>/<product>-এ রিডাইরেক্টের জন্য।
export async function fetchPageBySlug(
  slug: string,
): Promise<{ shopSlug: string; productSlug: string } | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('pages')
    .select('slug, shop_id')
    .eq('slug', slug)
    .eq('is_published', true)
    .eq('is_suspended', false)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as { slug: string; shop_id: string }
  const { data: shopData, error: shopError } = await client
    .from('shops')
    .select('slug')
    .eq('id', row.shop_id)
    .maybeSingle()
  if (shopError) throw shopError
  if (!shopData) return null
  return {
    shopSlug: (shopData as { slug: string }).slug,
    productSlug: row.slug,
  }
}

// ---------- সেলারের দোকান ----------

export async function fetchSellerShop(
  sellerId: string,
): Promise<ShopRow | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('shops')
    .select('*')
    .eq('seller_id', sellerId)
    .maybeSingle()
  if (error) throw error
  return data ? asShop(data) : null
}

// ---------- প্রোডাক্ট তালিকা (সেলার) ----------

export interface ProductListItem {
  product: ProductRow
  page: PageRow | null
  imageUrl: string | null
  orderCount: number
}

export async function fetchSellerProducts(
  sellerId: string,
): Promise<ProductListItem[]> {
  const client = requireSupabase()
  const { data: products, error: productError } = await client
    .from('products')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (productError) throw productError
  const productRows = (products ?? []).map(asProduct)
  const { data: pages } = await client
    .from('pages')
    .select('*')
    .eq('seller_id', sellerId)
  const pageByProduct = new Map<string, PageRow>()
  for (const p of (pages ?? []).map(asPage)) {
    pageByProduct.set(p.product_id, p)
  }
  const { data: images } = await client
    .from('product_images')
    .select('*')
    .eq('seller_id', sellerId)
    .order('sort_order', { ascending: true })
  const mainImageByProduct = new Map<string, string>()
  for (const img of (images ?? []).map(asImage)) {
    if (img.is_main && !mainImageByProduct.has(img.product_id)) {
      mainImageByProduct.set(img.product_id, img.url)
    }
  }
  const { data: orders } = await client
    .from('orders')
    .select('product_id')
    .eq('seller_id', sellerId)
  const orderCountByProduct = new Map<string, number>()
  for (const o of (orders ?? []) as { product_id: string | null }[]) {
    if (!o.product_id) continue
    orderCountByProduct.set(
      o.product_id,
      (orderCountByProduct.get(o.product_id) ?? 0) + 1,
    )
  }
  return productRows.map((product) => ({
    product,
    page: pageByProduct.get(product.id) ?? null,
    imageUrl: mainImageByProduct.get(product.id) ?? null,
    orderCount: orderCountByProduct.get(product.id) ?? 0,
  }))
}

export async function fetchProductForEdit(
  productId: string,
  sellerId: string,
): Promise<{
  product: ProductRow
  page: PageRow | null
  images: ProductImageRow[]
} | null> {
  const client = requireSupabase()
  const { data: productData, error } = await client
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('seller_id', sellerId)
    .maybeSingle()
  if (error) throw error
  if (!productData) return null
  const { data: pageData } = await client
    .from('pages')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle()
  const { data: imageData } = await client
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
  return {
    product: asProduct(productData),
    page: pageData ? asPage(pageData) : null,
    images: (imageData ?? []).map(asImage),
  }
}

// ---------- প্রোডাক্ট + পেজ সেভ ----------

export interface ProductInput {
  name: string
  price: number
  oldPrice: number | null
  description: string
  /** ছোট বিবরণ — undefined মানে এই ফিল্ডটা ছোঁয়া হবে না (যেমন ডুপ্লিকেটে)। */
  shortDescription?: string
  /** ক্যাটাগরি — undefined মানে এই ফিল্ডটা ছোঁয়া হবে না। */
  category?: string
  benefits: string[]
  specs: Record<string, string>
}

export interface PageInput {
  slug: string
  template: TemplateId
  sections: Record<string, boolean>
  sectionOrder: string[]
  videoUrl: string
  reviews: ReviewItem[]
  faqs: FaqItem[]
  /** ডেলিভারি তথ্য — undefined মানে এই ফিল্ডটা ছোঁয়া হবে না। */
  deliveryInfo?: string
  pageLang: PageLang
  isPublished: boolean
}

export async function saveProductAndPage(input: {
  sellerId: string
  shopId: string
  productId?: string
  product: ProductInput
  page: PageInput
}): Promise<{ productId: string; pageId: string }> {
  const client = requireSupabase()
  let productId = input.productId
  // বিল্ডারের নতুন ফিল্ড — শুধু পাঠানো হলে সেভ হবে (ডুপ্লিকেটে পাঠানো
  // হয় না, তাই পুরনো মান অপরিবর্তিত থাকে)।
  const productExtra =
    input.product.shortDescription !== undefined ||
    input.product.category !== undefined
      ? {
          ...(input.product.shortDescription !== undefined
            ? {
                short_description:
                  input.product.shortDescription.trim() || null,
              }
            : {}),
          ...(input.product.category !== undefined
            ? { category: input.product.category.trim() || null }
            : {}),
        }
      : {}
  if (productId) {
    const { error } = await client
      .from('products')
      .update({
        name: input.product.name,
        price: input.product.price,
        old_price: input.product.oldPrice,
        description: input.product.description || null,
        ...productExtra,
        benefits: input.product.benefits,
        specs: input.product.specs,
      })
      .eq('id', productId)
      .eq('seller_id', input.sellerId)
    if (error) throw error
  } else {
    const { data, error } = await client
      .from('products')
      .insert({
        seller_id: input.sellerId,
        shop_id: input.shopId,
        name: input.product.name,
        price: input.product.price,
        old_price: input.product.oldPrice,
        description: input.product.description || null,
        ...productExtra,
        benefits: input.product.benefits,
        specs: input.product.specs,
      })
      .select('id')
      .single()
    if (error) throw error
    productId = (data as { id: string }).id
  }
  const pagePayload = {
    product_id: productId,
    seller_id: input.sellerId,
    shop_id: input.shopId,
    slug: input.page.slug,
    template: input.page.template,
    sections: input.page.sections,
    section_order: input.page.sectionOrder,
    video_url: input.page.videoUrl || null,
    reviews: input.page.reviews,
    faqs: input.page.faqs,
    ...(input.page.deliveryInfo !== undefined
      ? { delivery_info: input.page.deliveryInfo.trim() || null }
      : {}),
    page_lang: input.page.pageLang,
    is_published: input.page.isPublished,
  }
  // প্রকাশ করতে চাইলে সার্ভারের সীমা-চেক — আগে থেকে প্রকাশিত পেজ
  // আবার সেভ করলে চেক লাগে না। আসল বাধা ডাটাবেসের ট্রিগারে।
  if (input.page.isPublished) {
    let alreadyPublished = false
    if (input.productId) {
      const { data: existingPage } = await client
        .from('pages')
        .select('is_published')
        .eq('product_id', input.productId)
        .maybeSingle()
      alreadyPublished = Boolean(
        (existingPage as { is_published: boolean } | null)?.is_published,
      )
    }
    if (!alreadyPublished) {
      const allowed = await canPublishPage(input.sellerId)
      if (!allowed) {
        throw new Error(
          'প্যাকেজের সীমা শেষ — নতুন পেজ প্রকাশ করতে প্যাকেজ আপগ্রেড করুন বা একটি পেজ খসড়া করুন।',
        )
      }
    }
  }
  const { data: pageData, error: pageError } = await client
    .from('pages')
    .upsert(pagePayload, { onConflict: 'product_id' })
    .select('id')
    .single()
  if (pageError) {
    if (pageError.code === '23505') {
      throw new Error('এই দোকানে এই লিংকের নামটা আগেই ব্যবহার হয়েছে — অন্য নাম দিন।')
    }
    throw pageError
  }
  return { productId, pageId: (pageData as { id: string }).id }
}

export interface ImageDraft {
  id?: string
  storagePath: string
  url: string
  isMain: boolean
  sortOrder: number
}

export async function syncProductImages(
  productId: string,
  sellerId: string,
  images: ImageDraft[],
): Promise<void> {
  const client = requireSupabase()
  const keepIds = new Set(images.filter((i) => i.id).map((i) => i.id as string))
  const { data: existing } = await client
    .from('product_images')
    .select('id, storage_path')
    .eq('product_id', productId)
  const toDelete = ((existing ?? []) as { id: string; storage_path: string }[]).filter(
    (row) => !keepIds.has(row.id),
  )
  for (const row of toDelete) {
    await client
      .from('product_images')
      .delete()
      .eq('id', row.id)
    await client.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([row.storage_path])
  }
  for (const img of images) {
    if (img.id) {
      const { error } = await client
        .from('product_images')
        .update({
          is_main: img.isMain,
          sort_order: img.sortOrder,
        })
        .eq('id', img.id)
      if (error) throw error
    } else {
      const { error } = await client.from('product_images').insert({
        product_id: productId,
        seller_id: sellerId,
        storage_path: img.storagePath,
        url: img.url,
        is_main: img.isMain,
        sort_order: img.sortOrder,
      })
      if (error) throw error
    }
  }
}

/**
 * ছবিকে ৪:৩ অনুপাতে মাঝখান থেকে কেটে (center-crop) নতুন File বানায় —
 * সব টেমপ্লেটে হিরো ছবির ফরম্যাট একই (৪:৩) রাখতে। ফাইলের নাম ও
 * টাইপ একই থাকে। ছবি আগেই ৪:৩ হলে, বা ছবি পড়া না গেলে, আসল
 * ফাইলটাই ফেরত যায় (আপলোড কখনো এই ক্রপের জন্য ভাঙবে না)।
 */
export async function cropImageTo43(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file)
    const w = bmp.width
    const h = bmp.height
    const target = 4 / 3
    if (Math.abs(w / h - target) < 0.01) {
      bmp.close()
      return file
    }
    let sw = w
    let sh = h
    let sx = 0
    let sy = 0
    if (w / h > target) {
      sw = Math.round(h * target)
      sx = Math.round((w - sw) / 2)
    } else {
      sh = Math.round(w / target)
      sy = Math.round((h - sh) / 2)
    }
    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bmp.close()
      return file
    }
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh)
    bmp.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type || 'image/jpeg', 0.92),
    )
    if (!blob) return file
    return new File([blob], file.name, {
      type: blob.type || file.type,
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}

export async function uploadProductImage(
  file: File,
  sellerId: string,
): Promise<{ storagePath: string; url: string }> {
  const client = requireSupabase()
  // আপলোডের আগেই ৪:৩-এ অটো ক্রপ — স্টোরেজে সবসময় সঠিক
  // ফরম্যাটের ছবিই যায়, যে রুটেই আপলোড হোক না কেন।
  const cropped = await cropImageTo43(file)
  const safeName = cropped.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60)
  const storagePath = `${sellerId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await client.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, cropped, { cacheControl: '31536000', upsert: false })
  if (error) throw error
  const { data } = client.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storagePath)
  return { storagePath, url: data.publicUrl }
}

export async function deleteProduct(productId: string): Promise<void> {
  const client = requireSupabase()
  const { data: images } = await client
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId)
  const paths = ((images ?? []) as { storage_path: string }[]).map(
    (row) => row.storage_path,
  )
  if (paths.length > 0) {
    await client.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths)
  }
  const { error } = await client.from('products').delete().eq('id', productId)
  if (error) throw error
}

/**
 * প্রোডাক্ট + পেজের হুবহু কপি — নতুন নাম "(কপি)", নতুন স্লাগ, সবসময়
 * খসড়া (প্রকাশের সীমায় হাত পড়ে না)। ছবিগুলোও স্টোরেজে নতুন পথে
 * কপি করা হয়, যাতে আসল বা কপি যেকোনো একটা মুছলেও অন্যটার ছবি
 * ভাঙে না। ছবির কপি ব্যর্থ হলে শুধু সেই ছবিটা বাদ যায়।
 */
export async function duplicateProduct(
  productId: string,
  sellerId: string,
  shopId: string,
): Promise<string> {
  const client = requireSupabase()
  const existing = await fetchProductForEdit(productId, sellerId)
  if (!existing) throw new Error('প্রোডাক্ট পাওয়া যায়নি।')
  const { product, page, images } = existing
  const { data: siblingPages } = await client
    .from('pages')
    .select('slug')
    .eq('seller_id', sellerId)
  const taken = new Set(
    ((siblingPages ?? []) as { slug: string }[]).map((r) => r.slug),
  )
  const base = slugify(page ? page.slug : product.name) || 'copy'
  let slug = `${base}-copy`
  let n = 2
  while (taken.has(slug)) {
    slug = `${base}-copy-${n}`
    n += 1
  }
  const { productId: newProductId } = await saveProductAndPage({
    sellerId,
    shopId,
    product: {
      name: `${product.name} (কপি)`,
      price: product.price,
      oldPrice: product.old_price,
      description: product.description ?? '',
      benefits: product.benefits,
      specs: product.specs,
    },
    page: {
      slug,
      template: page?.template ?? 'minimal-white',
      sections: page?.sections ?? {},
      sectionOrder: page?.section_order ?? [],
      videoUrl: page?.video_url ?? '',
      reviews: page?.reviews ?? [],
      faqs: page?.faqs ?? [],
      pageLang: page?.page_lang ?? 'bn',
      isPublished: false,
    },
  })
  for (const img of images) {
    try {
      const dot = img.storage_path.lastIndexOf('.')
      const ext = dot >= 0 ? img.storage_path.slice(dot) : ''
      const newPath = `${sellerId}/${crypto.randomUUID()}${ext}`
      const { error: copyError } = await client.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .copy(img.storage_path, newPath)
      if (copyError) continue
      const { data } = client.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(newPath)
      await client.from('product_images').insert({
        product_id: newProductId,
        seller_id: sellerId,
        storage_path: newPath,
        url: data.publicUrl,
        is_main: img.is_main,
        sort_order: img.sort_order,
      })
    } catch {
      // ছবির কপি ব্যর্থ হলে কপি পেজটা ছবি ছাড়াই থাকবে।
    }
  }
  return newProductId
}

export async function setPagePublished(
  pageId: string,
  published: boolean,
  sellerId: string,
): Promise<void> {
  const client = requireSupabase()
  // প্রকাশ করতে চাইলে সার্ভারের সীমা-চেক — আসল বাধা ডাটাবেসের ট্রিগারে।
  if (published) {
    const allowed = await canPublishPage(sellerId)
    if (!allowed) {
      throw new Error(
        'প্যাকেজের সীমা শেষ — নতুন পেজ প্রকাশ করতে প্যাকেজ আপগ্রেড করুন বা একটি পেজ খসড়া করুন।',
      )
    }
  }
  const { error } = await client
    .from('pages')
    .update({ is_published: published })
    .eq('id', pageId)
  if (error) throw error
}

// ---------- ড্যাশবোর্ডের পরিসংখ্যান (শুধু আসল ডাটা) ----------

export interface DashboardStats {
  todayOrders: number
  newOrders: number
  todaySales: number
  activePages: number
  salesLast7Days: number
  salesLast30Days: number
  /** সব অর্ডার (বাতিলসহ) */
  totalOrders: number
  /** চলতি মাসের বিক্রি (বাতিল বাদে) */
  monthSales: number
  /** সব ল্যান্ডিং পেজ (প্রকাশিত + খসড়া) */
  totalPages: number
  /** খসড়া পেজ */
  draftPages: number
  /** সাসপেন্ডেড পেজ (ফ্রি সার্ভিসে বন্ধ) */
  suspendedPages: number
  /** শেষ ৭ দিনের দৈনিক বিক্রি — চার্টের জন্য (label: শনি/রবি/…/আজ) */
  dailySales7: { label: string; total: number }[]
  /** শেষ ৩০ দিনের দৈনিক বিক্রি */
  dailySales30: { date: string; total: number }[]
  recentOrders: OrderRow[]
  newOrderList: OrderRow[]
}

export async function fetchDashboardStats(
  sellerId: string,
): Promise<DashboardStats> {
  const client = requireSupabase()
  const { data: ordersData, error: ordersError } = await client
    .from('orders')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (ordersError) throw ordersError
  const orders = (ordersData ?? []).map(asOrder)
  const { data: pagesData } = await client
    .from('pages')
    .select('id, is_published, is_suspended')
    .eq('seller_id', sellerId)
  const today = todayDhaka()
  const weekAgo = daysAgoDhaka(7)
  const monthAgo = daysAgoDhaka(30)
  const orderDate = (o: OrderRow) => o.created_at.slice(0, 10)
  const nonCancelled = (o: OrderRow) => o.status !== 'cancelled'
  const pages = (pagesData ?? []) as {
    id: string
    is_published: boolean
    is_suspended: boolean
  }[]
  const isActivePage = (p: { is_published: boolean; is_suspended: boolean }) =>
    p.is_published && !p.is_suspended
  const totalByDate = new Map<string, number>()
  for (const o of orders) {
    if (!nonCancelled(o)) continue
    const d = orderDate(o)
    totalByDate.set(d, (totalByDate.get(d) ?? 0) + Number(o.total))
  }
  const weekdayBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি']
  const dailySales7 = Array.from({ length: 7 }, (_, i) => {
    const offset = 6 - i
    const date = daysAgoDhaka(offset)
    const label =
      offset === 0
        ? 'আজ'
        : (weekdayBn[new Date(`${date}T12:00:00+06:00`).getDay()] ?? date)
    return { label, total: totalByDate.get(date) ?? 0 }
  })
  const dailySales30 = Array.from({ length: 30 }, (_, i) => {
    const date = daysAgoDhaka(29 - i)
    return { date, total: totalByDate.get(date) ?? 0 }
  })
  return {
    todayOrders: orders.filter((o) => orderDate(o) === today).length,
    newOrders: orders.filter((o) => o.status === 'new').length,
    todaySales: orders
      .filter((o) => orderDate(o) === today && nonCancelled(o))
      .reduce((sum, o) => sum + Number(o.total), 0),
    activePages: pages.filter(isActivePage).length,
    salesLast7Days: orders
      .filter((o) => orderDate(o) >= weekAgo && nonCancelled(o))
      .reduce((sum, o) => sum + Number(o.total), 0),
    salesLast30Days: orders
      .filter((o) => orderDate(o) >= monthAgo && nonCancelled(o))
      .reduce((sum, o) => sum + Number(o.total), 0),
    totalOrders: orders.length,
    monthSales: orders
      .filter(
        (o) => orderDate(o).slice(0, 7) === today.slice(0, 7) && nonCancelled(o),
      )
      .reduce((sum, o) => sum + Number(o.total), 0),
    totalPages: pages.length,
    draftPages: pages.filter((p) => !p.is_published).length,
    suspendedPages: pages.filter((p) => p.is_suspended).length,
    dailySales7,
    dailySales30,
    recentOrders: orders.slice(0, 5),
    newOrderList: orders.filter((o) => o.status === 'new').slice(0, 8),
  }
}
