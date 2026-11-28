// টেমপ্লেট ২-এর কাস্টমার রিভিউ — গড় রেটিং (বড় সংখ্যা +
// তারা), মোট রিভিউ সংখ্যা, তারার ভাঙন (৫★→১★ বার), রিভিউ
// কার্ড (ছবি/নামের অক্ষর, নাম, তারা, লেখা)। আসল রিভিউ
// থাকলেই দেখায়; রিভিউ না থাকলে পরিষ্কার খালি অবস্থা
// ("এখনো কোনো রিভিউ নেই") — কখনো বানানো রিভিউ নয়।
// "যাচাইকৃত ক্রয়" ব্যাজ শুধু ডাটায় স্পষ্ট verified: true
// থাকলেই দেখায় — আন্দাজে কখনো নয়।
import { bn } from './helpers.ts'
import type { TemplateTwoReview } from './types.ts'

function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <span
      aria-label={`${bn(rating)} তারা`}
      className="tracking-wide text-[#C9A227]"
    >
      {'★'.repeat(filled)}
      {'☆'.repeat(5 - filled)}
    </span>
  )
}

export default function TemplateTwoReviews({
  reviews,
  rating,
  reviewCount,
}: {
  reviews: TemplateTwoReview[]
  rating?: number
  reviewCount?: number
}) {
  const showRating = typeof rating === 'number' && (reviewCount ?? 0) > 0
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating ?? 0) === star).length,
  }))

  return (
    <section id="reviews" className="scroll-mt-6 py-10 lg:py-14">
      <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#294C3C]">
        কাস্টমারদের মতামত
      </p>
      <h2 className="m-0 mb-7 font-serif text-[28px] font-bold leading-tight text-[#181818] lg:text-4xl">
        কাস্টমার রিভিউ
      </h2>

      {reviews.length === 0 ? (
        <div className="rounded-[4px] border border-dashed border-[#D8D2C8] bg-white px-6 py-10 text-center">
          <p className="m-0 font-serif text-xl text-[#181818]">
            এখনো কোনো রিভিউ নেই
          </p>
          <p className="m-0 mt-2 text-[15px] text-[#77736F]">
            কাস্টমাররা পণ্যটি কিনে রিভিউ দিলে এখানে দেখা যাবে।
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 rounded-[4px] border border-[#EAE7E1] bg-white p-6 lg:grid-cols-[auto_1fr] lg:gap-12 lg:p-8">
            <div className="text-center lg:text-left">
              {showRating ? (
                <p className="m-0 font-serif text-6xl font-bold leading-none text-[#181818]">
                  {bn(rating ?? 0)}
                </p>
              ) : null}
              <p className="m-0 mt-2 text-lg">
                <Stars rating={rating ?? 0} />
              </p>
              <p className="m-0 mt-1.5 text-[15px] text-[#77736F]">
                {bn(reviewCount ?? reviews.length)}টি রিভিউ
              </p>
            </div>
            <div className="grid content-center gap-2">
              {breakdown.map((row) => {
                const pct =
                  reviews.length > 0
                    ? Math.round((row.count / reviews.length) * 100)
                    : 0
                return (
                  <div
                    key={row.star}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-6 shrink-0 font-semibold text-[#181818]">
                      {bn(row.star)}★
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#EFEAE3]">
                      <span
                        aria-hidden="true"
                        className="block h-full rounded-full bg-[#294C3C]"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right text-[#77736F]">
                      {bn(row.count)}টি
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {reviews.map((review, i) => (
              <article
                key={`${review.name}-${i}`}
                className="rounded-[4px] border border-[#EAE7E1] bg-white p-5 lg:p-6"
              >
                <div className="flex items-center gap-3">
                  {review.photoUrl ? (
                    <img
                      src={review.photoUrl}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#294C3C] font-serif text-lg font-bold text-white"
                    >
                      {review.name.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="m-0 truncate font-bold text-[#181818]">
                      {review.name}
                    </p>
                    <p className="m-0 flex flex-wrap items-center gap-x-2 text-sm">
                      {typeof review.rating === 'number' ? (
                        <Stars rating={review.rating} />
                      ) : null}
                      {review.verified === true ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E9EEE9] px-2 py-0.5 text-xs font-semibold text-[#294C3C]">
                          ✓ যাচাইকৃত ক্রয়
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                {review.text ? (
                  <p className="m-0 mt-3 leading-relaxed text-[#55524E]">
                    {review.text}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
