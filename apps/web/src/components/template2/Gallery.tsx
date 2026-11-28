// টেমপ্লেট ২-এর গ্যালারি — বড় মূল ছবি বর্গক্ষেত্রে
// (aspect-square — সব টেমপ্লেটে একই ছবির মাপ) + নিচে
// থাম্বনেইলের সারি। আসল ছবির পেছনে একই ছবির ব্লার করা
// কপি থাকে (bg blur), সামনে আসল ছবি object-contain-এ —
// কখনো ক্রপ হয় না। থাম্বনেইলে ক্লিক করলে মূল ছবি বদলায়;
// মূল ছবিতে ক্লিক করলে লাইটবক্স খোলে। মোবাইলে মূল ছবিতে
// সোয়াইপ + নিচে পেজিনেশন ডট; থাম্বনেইল ডেস্কটপেই দেখায়।
// সব থাম্বনেইল একই মাপের বর্গক্ষেত্র। আসল ছবি না থাকলে
// প্লেসহোল্ডার ব্লক দেখায়।
import { useRef } from 'react'
import { bn, FOCUS_RING } from './helpers.ts'
import TemplateTwoPlaceholderImage from './PlaceholderImage.tsx'
import type { TemplateTwoImage } from './types.ts'

const SWIPE_MIN_PX = 50

export default function TemplateTwoGallery({
  images,
  productName,
  activeIndex,
  onSelect,
  onOpen,
}: {
  images: TemplateTwoImage[]
  productName: string
  activeIndex: number
  onSelect: (index: number) => void
  onOpen: (index: number) => void
}) {
  const touchStartX = useRef<number | null>(null)
  // সোয়াইপের ঠিক পরের ক্লিকটা (টাচের পর ব্রাউজার যে ক্লিক
  // পাঠায়) লাইটবক্স খুলবে না — তবে শুধু ৩৫০ মিলিসেকেন্ডের
  // মধ্যে; তার পরে ট্যাপ করলে স্বাভাবিকভাবে খুলবে।
  const lastSwipeAt = useRef(0)

  const current = images[activeIndex] ?? images[0]
  if (!current) {
    return (
      <TemplateTwoPlaceholderImage
        label={productName}
        className="aspect-square w-full"
      />
    )
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartX.current
    touchStartX.current = null
    if (startX === null || images.length < 2) return
    const dx = (e.changedTouches[0]?.clientX ?? startX) - startX
    if (Math.abs(dx) < SWIPE_MIN_PX) return
    lastSwipeAt.current = Date.now()
    onSelect(
      (activeIndex + (dx < 0 ? 1 : -1) + images.length) % images.length,
    )
  }
  const onMainClick = () => {
    if (Date.now() - lastSwipeAt.current < 350) return
    onOpen(activeIndex)
  }

  return (
    <div>
      <button
        type="button"
        onClick={onMainClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-label="বড় করে দেখুন"
        className={`relative grid aspect-square w-full cursor-zoom-in place-items-center overflow-hidden rounded-[4px] border border-[#EAE7E1] bg-[#EFEAE3] p-0 ${FOCUS_RING}`}
      >
        {current.url ? (
          <>
            <img
              src={current.url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl"
            />
            <img
              src={current.url}
              alt={current.alt}
              className="relative h-[86%] w-[86%] object-contain"
            />
          </>
        ) : (
          <TemplateTwoPlaceholderImage
            label={current.label ?? current.alt}
            className="absolute inset-0"
          />
        )}
        <span className="absolute bottom-3.5 right-3.5 rounded-full bg-white/90 px-3 py-1 text-sm text-[#77736F]">
          ছবিতে ট্যাপ করে বড় দেখুন
        </span>
      </button>

      {images.length > 1 ? (
        <>
          {/* মোবাইল: পেজিনেশন ডট */}
          <div
            className="mt-3 flex justify-center gap-2 lg:hidden"
            aria-label="ছবি বেছে নিন"
          >
            {images.map((img, i) => (
              <button
                key={img.alt + i}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`ছবি ${bn(i + 1)}${img.label ? ` — ${img.label}` : ''}`}
                aria-current={i === activeIndex}
                className={`h-2.5 rounded-full transition-all ${
                  i === activeIndex
                    ? 'w-7 bg-[#294C3C]'
                    : 'w-2.5 bg-[#D8D2C8]'
                } ${FOCUS_RING}`}
              />
            ))}
          </div>
          {/* ডেস্কটপ: থাম্বনেইলের সারি */}
          <div className="mt-3.5 hidden grid-cols-5 gap-3 lg:grid">
            {images.map((img, i) => (
              <button
                key={img.alt + i}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`ছবি ${bn(i + 1)}${img.label ? ` — ${img.label}` : ''}`}
                aria-current={i === activeIndex}
                className={`relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-[4px] border-2 bg-[#EFEAE3] p-0 ${
                  i === activeIndex ? 'border-[#294C3C]' : 'border-transparent'
                } ${FOCUS_RING}`}
              >
                {img.url ? (
                  <>
                    <img
                      src={img.url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-md"
                    />
                    <img
                      src={img.url}
                      alt=""
                      className="relative h-[88%] w-[88%] object-contain"
                    />
                  </>
                ) : (
                  <TemplateTwoPlaceholderImage
                    label={img.label ?? img.alt}
                    className="absolute inset-0"
                  />
                )}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
