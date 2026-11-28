// টেমপ্লেট ১-এর পণ্যের তথ্য — ক্যাটাগরি, নাম, তারা + রিভিউ
// সংখ্যা, স্টক, দাম + পুরনো দাম + ছাড়ের ব্যাজ, ৩টি সুবিধা,
// বড় লাল "অর্ডার করুন" বোতাম (ফর্মে স্ক্রল করে), ৩টি আস্থার বাক্স।
// রিভিউ না থাকলে তারার লাইন দেখায় না; স্টক না থাকলে স্টকের
// লাইন দেখায় না — কোনো সংখ্যা বানানো হয় না।
import { discountPercent } from '../../lib/pricing.ts'
import { bdt, bn, FOCUS_RING } from './helpers.ts'
import type { TemplateOneProduct } from './types.ts'

const TRUST_BOXES: { title: string; text: string }[] = [
  { title: 'ক্যাশ অন ডেলিভারি', text: 'পণ্য হাতে পেয়ে টাকা দিন' },
  { title: 'দ্রুত ডেলিভারি', text: 'ঢাকায় ১-২ দিন' },
  { title: '৭ দিনের রিটার্ন', text: 'সমস্যা হলে ফেরত' },
]

export default function TemplateOneProductInfo({
  product,
}: {
  product: TemplateOneProduct
}) {
  const discount = discountPercent(product.price, product.oldPrice)
  const showRating =
    typeof product.rating === 'number' &&
    typeof product.reviewCount === 'number' &&
    product.reviewCount > 0
  const filledStars = showRating ? Math.round(product.rating ?? 0) : 0

  return (
    <div>
      {product.category ? (
        <span className="inline-block rounded-full bg-[#E8F3EC] px-3 py-0.5 text-sm font-semibold text-[#0B5D3B]">
          {product.category}
        </span>
      ) : null}
      <h1 className="mb-2.5 mt-3 text-[27px] font-bold leading-snug min-[861px]:text-4xl">
        {product.name}
      </h1>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-[#5B6B62]">
        {showRating ? (
          <>
            <span>
              <span className="tracking-wide text-[#E9A100]">
                {'★'.repeat(filledStars)}
              </span>{' '}
              {bn(product.rating ?? 0)}
            </span>
            <span>{bn(product.reviewCount ?? 0)}টি রিভিউ</span>
          </>
        ) : null}
        {typeof product.stock === 'number' ? (
          <span className="font-semibold text-[#0B5D3B]">
            স্টকে আছে: {bn(product.stock)} পিস
          </span>
        ) : null}
      </div>
      <div className="mb-1.5 mt-[22px] flex flex-wrap items-baseline gap-3.5">
        <b className="text-4xl leading-none text-[#0B5D3B] min-[861px]:text-[44px]">
          {bdt(product.price)}
        </b>
        {product.oldPrice && product.oldPrice > product.price ? (
          <s className="text-[22px] text-[#5B6B62]">{bdt(product.oldPrice)}</s>
        ) : null}
        {discount > 0 ? (
          <span className="rounded-md bg-[#D7263D] px-2.5 py-0.5 text-[15px] font-semibold text-white">
            {bn(discount)}% ছাড়
          </span>
        ) : null}
      </div>
      {product.highlights.length > 0 ? (
        <ul className="m-0 my-5 grid list-none gap-2 p-0">
          {product.highlights.slice(0, 3).map((h) => (
            <li key={h} className="relative pl-7">
              <span
                aria-hidden="true"
                className="absolute left-0 top-[9px] h-3.5 w-3.5 rounded-full bg-[#0B5D3B]"
              />
              {h}
            </li>
          ))}
        </ul>
      ) : null}
      <a
        href="#order"
        className={`block min-h-[56px] w-full rounded-[14px] bg-[#D7263D] px-4 py-[15px] text-center text-xl font-bold text-white no-underline hover:bg-[#B91D31] ${FOCUS_RING}`}
      >
        অর্ডার করুন
      </a>
      <div className="mt-4 grid grid-cols-1 gap-2.5 min-[861px]:grid-cols-3">
        {TRUST_BOXES.map((box) => (
          <div
            key={box.title}
            className="rounded-xl border border-[#DCE5DF] bg-white p-2.5 text-center text-sm leading-snug"
          >
            <b className="block text-[15px] text-[#0B5D3B]">{box.title}</b>
            {box.text}
          </div>
        ))}
      </div>
    </div>
  )
}
