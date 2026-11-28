// টেমপ্লেট ২-এর কালেকশন হাইলাইট — সুবিধার ৪টি এডিটোরিয়াল
// কার্ড (প্রিমিয়াম ফ্যাব্রিক, আরামদায়ক ফিট, আধুনিক ডিজাইন,
// মানসম্মত ফিনিশিং)। লেখা ডাটা থেকে আসে, তাই সেলার বদলাতে
// পারে। খালি থাকলে সেকশন আসে না।
import { TemplateTwoIcon } from './icons.tsx'
import type { TemplateTwoHighlight } from './types.ts'

export default function TemplateTwoHighlights({
  highlights,
}: {
  highlights: TemplateTwoHighlight[]
}) {
  if (highlights.length === 0) return null
  return (
    <section id="highlights" className="scroll-mt-6 py-10 lg:py-14">
      <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#294C3C]">
        কেন এই পণ্যটি
      </p>
      <h2 className="m-0 mb-7 font-serif text-[28px] font-bold leading-tight text-[#181818] lg:text-4xl">
        কালেকশন হাইলাইট
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((h) => (
          <article
            key={h.title}
            className="rounded-[4px] border border-[#EAE7E1] bg-white p-6"
          >
            <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#E9EEE9] text-[#294C3C]">
              <TemplateTwoIcon kind={h.icon} className="h-6 w-6" />
            </span>
            <h3 className="m-0 mb-1.5 font-serif text-xl font-bold text-[#181818]">
              {h.title}
            </h3>
            {h.text ? (
              <p className="m-0 text-[15px] leading-relaxed text-[#77736F]">
                {h.text}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
