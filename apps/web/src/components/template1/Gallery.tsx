// টেমপ্লেট ১-এর গ্যালারি — হালকা সবুজ বর্গক্ষেত্রে বড় ছবি,
// পেছনে বড় লাল বৃত্ত; নিচে থাম্বনেইলের সারি। প্রতিটা থাম্বনেইল
// একই মাপের বর্গক্ষেত্র (aspect-ratio 1, object-fit contain);
// চালু থাম্বনেইলে সবুজ বর্ডার। ছবিতে ক্লিক করলে লাইটবক্স খোলে।
import { bn, FOCUS_RING } from './helpers.ts'
import type { TemplateOneImage } from './types.ts'

export default function TemplateOneGallery({
  images,
  productName,
  activeIndex,
  onSelect,
  onOpen,
}: {
  images: TemplateOneImage[]
  productName: string
  activeIndex: number
  onSelect: (index: number) => void
  onOpen: (index: number) => void
}) {
  const current = images[activeIndex] ?? images[0]
  if (!current) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-3xl bg-[#E8F3EC] text-6xl font-bold text-[#0B5D3B]">
        {productName.charAt(0)}
      </div>
    )
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => onOpen(activeIndex)}
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
      {images.length > 1 ? (
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
        </div>
      ) : null}
    </div>
  )
}
