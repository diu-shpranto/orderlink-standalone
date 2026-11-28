// টেমপ্লেট ২-এর বিশেষ অফার — ছাড়ের তথ্য, দাম, পণ্যের ছবি,
// প্রোমো বার্তা, অর্ডার CTA। কোনো ভুয়া কাউন্টডাউন টাইমার
// বা মিথ্যা সংকটের বার্তা নেই — শুধু আসল ছাড় আর দাম।
// ছাড়ও নেই, প্রোমো বার্তাও নেই — এমন হলে সেকশন আসে না।
import { discountPercent } from '../../lib/pricing.ts'
import { bdt, bn, FOCUS_RING } from './helpers.ts'
import TemplateTwoPlaceholderImage from './PlaceholderImage.tsx'
import type { TemplateTwoProduct } from './types.ts'

export default function TemplateTwoSpecialOffer({
  product,
}: {
  product: TemplateTwoProduct
}) {
  const discount = discountPercent(product.price, product.oldPrice)
  const show = discount > 0 || Boolean(product.promoMessage)
  if (!show) return null
  const firstImage = product.images[0]

  return (
    <section className="py-10 lg:py-14">
      <div className="grid grid-cols-1 items-center gap-6 overflow-hidden rounded-[4px] bg-[#294C3C] p-6 text-white lg:grid-cols-[200px_1fr_auto] lg:gap-10 lg:p-10">
        <div className="hidden lg:block">
          {firstImage?.url ? (
            <img
              src={firstImage.url}
              alt={firstImage.alt}
              className="block aspect-[4/5] w-full rounded-[4px] object-cover"
            />
          ) : (
            <TemplateTwoPlaceholderImage
              label={firstImage?.label ?? product.name}
              className="aspect-[4/5] w-full rounded-[4px]"
            />
          )}
        </div>
        <div>
          <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#CFE0D4]">
            বিশেষ অফার
          </p>
          <h2 className="m-0 mb-2 font-serif text-[28px] font-bold leading-tight lg:text-4xl">
            {product.promoMessage ?? `${bn(discount)}% ছাড়ে ${product.name}`}
          </h2>
          <p className="m-0 flex flex-wrap items-baseline gap-3">
            <b className="font-serif text-3xl">{bdt(product.price)}</b>
            {product.oldPrice && product.oldPrice > product.price ? (
              <s className="text-xl text-white/70">{bdt(product.oldPrice)}</s>
            ) : null}
            {discount > 0 ? (
              <span className="rounded-sm bg-white px-2.5 py-0.5 text-[15px] font-bold text-[#294C3C]">
                {bn(discount)}% ছাড়
              </span>
            ) : null}
          </p>
        </div>
        <a
          href="#order"
          className={`block min-h-[56px] rounded-[4px] bg-white px-6 py-[15px] text-center text-lg font-bold text-[#294C3C] no-underline hover:bg-[#E9EEE9] ${FOCUS_RING}`}
        >
          এখনই অর্ডার করুন
        </a>
      </div>
    </section>
  )
}
