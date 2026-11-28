// টেমপ্লেট ১-এর কাস্টমার রিভিউ — আসল রিভিউ থাকলেই দেখায়,
// না থাকলে পুরো সেকশন আসে না। ওপরে মোট রেটিং (গড়, বাংলা
// সংখ্যায়) + মোট রিভিউ সংখ্যা। প্রতিটা কার্ডে কাস্টমারের
// ছবি (না থাকলে নামের অক্ষরের বৃত্ত), নাম, তারা, লেখা;
// রিভিউর ছবি থাকলে থাম্বনেইল — ট্যাপ করলে লাইটবক্সে খোলে।
// "যাচাইকৃত ক্রয়" ব্যাজ শুধু ডাটায় স্পষ্ট verified: true
// থাকলেই দেখায় — আন্দাজে কখনো নয়।
import { useState } from 'react'
import { bn, FOCUS_RING } from './helpers.ts'
import TemplateOneLightbox from './Lightbox.tsx'
import type { TemplateOneReview } from './types.ts'

function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <span aria-label={`${bn(rating)} তারা`} className="tracking-wide text-[#E9A100]">
      {'★'.repeat(filled)}
      {'☆'.repeat(5 - filled)}
    </span>
  )
}

export default function TemplateOneReviews({
  reviews,
  rating,
  reviewCount,
}: {
  reviews: TemplateOneReview[]
  rating?: number
  reviewCount?: number
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  if (reviews.length === 0) return null
  const screenshots = reviews
    .map((r, i) => ({ url: r.screenshotUrl, index: i }))
    .filter((s): s is { url: string; index: number } =>
      Boolean(s.url),
    )
  const showRating = typeof rating === 'number' && (reviewCount ?? 0) > 0

  return (
    <section className="py-7">
      <h2 className="mb-2 text-2xl font-bold min-[861px]:text-[28px]">
        কাস্টমার রিভিউ
      </h2>
      {showRating ? (
        <p className="m-0 mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-[#5B6B62]">
          <Stars rating={rating ?? 0} />
          <b className="text-[#14211A]">{bn(rating ?? 0)}</b>
          <span>{bn(reviewCount ?? 0)}টি রিভিউ</span>
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3.5 min-[861px]:grid-cols-2">
        {reviews.map((review, i) => (
          <article
            key={`${review.name}-${i}`}
            className="rounded-[18px] border border-[#DCE5DF] bg-white p-4 min-[861px]:p-5"
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
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0B5D3B] text-lg font-bold text-white"
                >
                  {review.name.charAt(0)}
                </span>
              )}
              <div className="min-w-0">
                <p className="m-0 truncate font-bold">{review.name}</p>
                <p className="m-0 flex flex-wrap items-center gap-x-2 text-sm">
                  {typeof review.rating === 'number' ? (
                    <Stars rating={review.rating} />
                  ) : null}
                  {review.verified === true ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F3EC] px-2 py-0.5 text-xs font-semibold text-[#0B5D3B]">
                      ✓ যাচাইকৃত ক্রয়
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            {review.text ? (
              <p className="m-0 mt-3 leading-relaxed">{review.text}</p>
            ) : null}
            {review.screenshotUrl ? (
              <button
                type="button"
                onClick={() => {
                  const pos = screenshots.findIndex((s) => s.index === i)
                  if (pos >= 0) setLightboxIndex(pos)
                }}
                aria-label="রিভিউর ছবি বড় করে দেখুন"
                className={`mt-3 block cursor-zoom-in overflow-hidden rounded-xl border border-[#DCE5DF] p-0 ${FOCUS_RING}`}
              >
                <img
                  src={review.screenshotUrl}
                  alt=""
                  className="block max-h-[220px] w-full object-cover"
                />
              </button>
            ) : null}
          </article>
        ))}
      </div>
      {lightboxIndex !== null && screenshots.length > 0 ? (
        <TemplateOneLightbox
          images={screenshots.map((s) => ({
            url: s.url,
            alt: 'রিভিউর ছবি',
          }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(direction) =>
            setLightboxIndex(
              (current) =>
                current === null
                  ? current
                  : (current + direction + screenshots.length) %
                    screenshots.length,
            )
          }
        />
      ) : null}
    </section>
  )
}
