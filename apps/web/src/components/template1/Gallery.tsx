// টেমপ্লেট ১-এর গ্যালারি — হালকা সবুজ বর্গক্ষেত্রে বড় ছবি,
// পেছনে বড় লাল বৃত্ত; নিচে থাম্বনেইলের সারি। প্রতিটা থাম্বনেইল
// একই মাপের বর্গক্ষেত্র (aspect-ratio 1, object-fit contain);
// চালু থাম্বনেইলে সবুজ বর্ডার। ছবিতে ক্লিক করলে লাইটবক্স খোলে।
// মোবাইলে মূল ছবিতে সোয়াইপ করলে ছবি বদলায় (বাঁয়ে/ডানে)।
// ভিডিও থাকলে থাম্বনেইলের সারির শেষে ভিডিওর থাম্বনেইল আসে
// (▶ ব্যাজসহ) — ট্যাপ করলে ভিডিও সেকশনে গিয়ে সেই ভিডিও চলে।
import { useRef } from 'react'
import { bn, FOCUS_RING, youtubeEmbedId } from './helpers.ts'
import type { TemplateOneImage, TemplateOneVideo } from './types.ts'

const SWIPE_MIN_PX = 50

export default function TemplateOneGallery({
  images,
  productName,
  activeIndex,
  onSelect,
  onOpen,
  videos = [],
  onSelectVideo,
}: {
  images: TemplateOneImage[]
  productName: string
  activeIndex: number
  onSelect: (index: number) => void
  onOpen: (index: number) => void
  videos?: TemplateOneVideo[]
  onSelectVideo?: (index: number) => void
}) {
  const touchStartX = useRef<number | null>(null)
  // সোয়াইপের ঠিক পরের ক্লিকটা (টাচের পর ব্রাউজার যে ক্লিক
  // পাঠায়) লাইটবক্স খুলবে না — তবে শুধু ৩৫০ মিলিসেকেন্ডের
  // মধ্যে; তার পরে ট্যাপ করলে স্বাভাবিকভাবে খুলবে।
  const lastSwipeAt = useRef(0)
  const playableVideos = videos
    .map((v, i) => ({ ...v, index: i, id: youtubeEmbedId(v.url) }))
    .filter((v): v is typeof v & { id: string } => v.id !== null)

  const current = images[activeIndex] ?? images[0]
  if (!current) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-3xl bg-[#E8F3EC] text-6xl font-bold text-[#0B5D3B]">
        {productName.charAt(0)}
      </div>
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
        className={`relative grid aspect-square w-full cursor-zoom-in place-items-center overflow-hidden rounded-3xl border-0 bg-[#E8F3EC] p-0 ${FOCUS_RING}`}
      >
        <span
          aria-hidden="true"
          className="absolute aspect-square w-[68%] rounded-full bg-[#D7263D]"
        />
        <img
          src={current.url}
          alt={productName}
          className="relative h-[86%] w-[86%] object-contain"
        />
        <span className="absolute bottom-3.5 right-3.5 rounded-full bg-white px-3 py-1 text-sm text-[#5B6B62]">
          ছবিতে ট্যাপ করে বড় দেখুন
        </span>
      </button>
      {images.length > 1 || playableVideos.length > 0 ? (
        <div className="mt-3.5 grid grid-cols-4 gap-3">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`ছবি ${bn(i + 1)}`}
              aria-current={i === activeIndex}
              className={`relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-[14px] border-2 bg-[#E8F3EC] p-0 ${
                i === activeIndex ? 'border-[#0B5D3B]' : 'border-transparent'
              } ${FOCUS_RING}`}
            >
              <span
                aria-hidden="true"
                className="absolute aspect-square w-[62%] rounded-full bg-[#D7263D]"
              />
              <img
                src={img.url}
                alt=""
                className="relative h-[88%] w-[88%] object-contain"
              />
            </button>
          ))}
          {playableVideos.map((v) => (
            <button
              key={`video-${v.index}`}
              type="button"
              onClick={() => onSelectVideo?.(v.index)}
              aria-label={`ভিডিও দেখুন${v.label ? ` — ${v.label}` : ''}`}
              className={`relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-[14px] border-2 border-transparent bg-[#14211A] p-0 ${FOCUS_RING}`}
            >
              <img
                src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-80"
              />
              <span
                aria-hidden="true"
                className="relative grid h-10 w-10 place-items-center rounded-full bg-[#D7263D] text-base leading-none text-white"
              >
                ▶
              </span>
              {v.label ? (
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
                  {v.label}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
