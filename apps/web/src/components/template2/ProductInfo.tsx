// টেমপ্লেট ২-এর পণ্যের তথ্য (হিরোর ডান দিক) — সংগ্রহের লেবেল,
// বড় এডিটোরিয়াল শিরোনাম, পণ্যের নাম, ছোট বিবরণ, তারা +
// রিভিউ সংখ্যা, স্টক, দাম + পুরনো দাম + ছাড়ের ব্যাজ, রং
// সিলেক্টর (সোয়াচ), সাইজ সিলেক্টর (পিল + সাইজ গাইড লিংক),
// পরিমাণ স্টেপার, দুটো CTA (এখনই অর্ডার করুন / অর্ডার ফর্মে
// যান)। রিভিউ না থাকলে তারার লাইন দেখায় না; স্টক না থাকলে
// স্টকের লাইন দেখায় না; সাইজ/রং না থাকলে সেই সিলেক্টর
// দেখায় না — কোনো তথ্য বানানো হয় না।
import { discountPercent } from '../../lib/pricing.ts'
import { bdt, bn, FOCUS_RING } from './helpers.ts'
import type { TemplateTwoProduct } from './types.ts'

export default function TemplateTwoProductInfo({
  product,
  size,
  color,
  quantity,
  onSizeChange,
  onColorChange,
  onQuantityChange,
}: {
  product: TemplateTwoProduct
  size: string
  color: string
  quantity: number
  onSizeChange: (size: string) => void
  onColorChange: (color: string) => void
  onQuantityChange: (quantity: number) => void
}) {
  const discount = discountPercent(product.price, product.oldPrice)
  const showRating =
    typeof product.rating === 'number' &&
    typeof product.reviewCount === 'number' &&
    product.reviewCount > 0
  const filledStars = showRating ? Math.round(product.rating ?? 0) : 0
  const selectedColor = product.colors.find((c) => c.name === color)

  return (
    <div>
      {product.collectionLabel ? (
        <p className="m-0 text-xs font-bold uppercase tracking-[0.22em] text-[#294C3C]">
          {product.collectionLabel}
        </p>
      ) : null}
      <h1 className="mb-2 mt-3 font-serif text-[34px] font-bold leading-[1.15] text-[#181818] lg:text-[44px]">
        {product.headline ?? product.name}
      </h1>
      {product.headline ? (
        <p className="m-0 mb-1 font-serif text-xl text-[#181818] lg:text-2xl">
          {product.name}
        </p>
      ) : null}
      {product.category ? (
        <p className="m-0 mb-3 text-[15px] text-[#77736F]">
          {product.category}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-[#77736F]">
        {showRating ? (
          <>
            <span>
              <span className="tracking-wide text-[#C9A227]">
                {'★'.repeat(filledStars)}
                {'☆'.repeat(5 - filledStars)}
              </span>{' '}
              <b className="text-[#181818]">{bn(product.rating ?? 0)}</b>
            </span>
            <span>{bn(product.reviewCount ?? 0)}টি রিভিউ</span>
          </>
        ) : null}
        {typeof product.stock === 'number' ? (
          <span className="font-semibold text-[#294C3C]">
            স্টকে আছে: {bn(product.stock)} পিস
          </span>
        ) : null}
      </div>

      <div className="mb-1.5 mt-5 flex flex-wrap items-baseline gap-3.5">
        <b className="font-serif text-[38px] leading-none text-[#181818] lg:text-[44px]">
          {bdt(product.price)}
        </b>
        {product.oldPrice && product.oldPrice > product.price ? (
          <s className="text-[22px] text-[#77736F]">{bdt(product.oldPrice)}</s>
        ) : null}
        {discount > 0 ? (
          <span className="rounded-sm bg-[#294C3C] px-2.5 py-0.5 text-[15px] font-semibold text-white">
            {bn(discount)}% ছাড়
          </span>
        ) : null}
      </div>

      {product.shortDescription ? (
        <p className="m-0 mb-6 mt-4 max-w-[560px] leading-relaxed text-[#55524E]">
          {product.shortDescription}
        </p>
      ) : null}

      {product.colors.length > 0 ? (
        <div className="mb-5">
          <p className="m-0 mb-2.5 text-[15px] font-semibold text-[#181818]">
            রং:{' '}
            <span className="font-normal text-[#77736F]">
              {selectedColor ? selectedColor.name : 'বেছে নিন'}
            </span>
          </p>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="রং বেছে নিন">
            {product.colors.map((c) => {
              const checked = color === c.name
              return (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={`রং ${c.name}`}
                  onClick={() => onColorChange(c.name)}
                  title={c.name}
                  className={`h-11 w-11 rounded-full border-2 p-[3px] ${
                    checked
                      ? 'border-[#294C3C]'
                      : 'border-[#EAE7E1] hover:border-[#B9B2A6]'
                  } ${FOCUS_RING}`}
                >
                  <span
                    aria-hidden="true"
                    className="block h-full w-full rounded-full border border-black/10"
                    style={{ backgroundColor: c.hex }}
                  />
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {product.sizes.length > 0 ? (
        <div className="mb-5">
          <p className="m-0 mb-2.5 flex flex-wrap items-center justify-between gap-2 text-[15px] font-semibold text-[#181818]">
            <span>
              সাইজ:{' '}
              <span className="font-normal text-[#77736F]">
                {size ? size : 'বেছে নিন'}
              </span>
            </span>
            <a
              href="#size-guide"
              className={`text-sm font-medium text-[#294C3C] underline underline-offset-2 ${FOCUS_RING}`}
            >
              সাইজ গাইড দেখুন
            </a>
          </p>
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="সাইজ বেছে নিন">
            {product.sizes.map((s) => {
              const checked = size === s
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => onSizeChange(s)}
                  className={`min-h-[48px] min-w-[52px] rounded-[4px] border-[1.5px] px-3.5 py-2 text-[15px] font-semibold ${
                    checked
                      ? 'border-[#294C3C] bg-[#294C3C] text-white'
                      : 'border-[#EAE7E1] bg-white text-[#181818] hover:border-[#294C3C]'
                  } ${FOCUS_RING}`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex items-center gap-3">
        <span className="text-[15px] font-semibold text-[#181818]">পরিমাণ</span>
        <span className="flex items-center rounded-[4px] border-[1.5px] border-[#EAE7E1] bg-white">
          <button
            type="button"
            aria-label="কমান"
            disabled={quantity <= 1}
            onClick={() => onQuantityChange(quantity - 1)}
            className={`h-12 w-12 text-2xl leading-none text-[#294C3C] disabled:opacity-40 ${FOCUS_RING}`}
          >
            −
          </button>
          <span aria-live="polite" className="min-w-[34px] text-center font-bold">
            {bn(quantity)}
          </span>
          <button
            type="button"
            aria-label="বাড়ান"
            disabled={quantity >= 10}
            onClick={() => onQuantityChange(quantity + 1)}
            className={`h-12 w-12 text-2xl leading-none text-[#294C3C] disabled:opacity-40 ${FOCUS_RING}`}
          >
            +
          </button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <a
          href="#order"
          className={`block min-h-[56px] rounded-[4px] bg-[#294C3C] px-4 py-[15px] text-center text-lg font-bold text-white no-underline hover:bg-[#1F3D2F] ${FOCUS_RING}`}
        >
          এখনই অর্ডার করুন
        </a>
        <a
          href="#order"
          className={`block min-h-[56px] rounded-[4px] border-[1.5px] border-[#294C3C] bg-white px-4 py-[15px] text-center text-lg font-bold text-[#294C3C] no-underline hover:bg-[#E9EEE9] ${FOCUS_RING}`}
        >
          অর্ডার ফর্মে যান
        </a>
      </div>
    </div>
  )
}
