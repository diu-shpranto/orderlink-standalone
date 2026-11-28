// টেমপ্লেট ২-এর পণ্যের গল্প — ফ্যাশন ম্যাগাজিনের মতো
// অল্টারনেটিং ছবি + লেখার লেআউট (একবার ছবি বাঁয়ে, একবার
// ডানে)। অনুপ্রেরণা, কাপড়ের মান, ডিজাইন-দর্শন, কারিগরি,
// আরাম, স্টাইলিং — ডাটার ব্লকগুলো ক্রমানুযায়ী আসে। কার্ডের
// পুনরাবৃত্তি নয়। ছবি না থাকলে প্লেসহোল্ডার ব্লক দেখায়।
// খালি থাকলে সেকশন আসে না।
import { bn } from './helpers.ts'
import TemplateTwoPlaceholderImage from './PlaceholderImage.tsx'
import type { TemplateTwoStoryBlock } from './types.ts'

export default function TemplateTwoStory({
  story,
}: {
  story: TemplateTwoStoryBlock[]
}) {
  if (story.length === 0) return null
  return (
    <section id="story" className="scroll-mt-6 py-10 lg:py-14">
      <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#294C3C]">
        পণ্যের গল্প
      </p>
      <h2 className="m-0 mb-9 font-serif text-[28px] font-bold leading-tight text-[#181818] lg:text-4xl">
        যেভাবে তৈরি, যেভাবে পরবেন
      </h2>
      <div className="grid gap-12 lg:gap-16">
        {story.map((block, i) => {
          const imageFirst = i % 2 === 0
          return (
            <div
              key={block.title}
              className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-14"
            >
              <div className={imageFirst ? '' : 'lg:order-2'}>
                {block.imageUrl ? (
                  <img
                    src={block.imageUrl}
                    alt={block.imageLabel}
                    className="block aspect-[4/3] w-full rounded-[4px] border border-[#EAE7E1] object-cover"
                  />
                ) : (
                  <TemplateTwoPlaceholderImage
                    label={block.imageLabel}
                    className="aspect-[4/3] w-full rounded-[4px] border border-[#EAE7E1]"
                  />
                )}
              </div>
              <div className={imageFirst ? '' : 'lg:order-1'}>
                <p
                  aria-hidden="true"
                  className="m-0 mb-2 font-serif text-5xl font-bold text-[#E9EEE9]"
                >
                  {bn(i + 1)}
                </p>
                <h3 className="m-0 mb-3 font-serif text-2xl font-bold leading-snug text-[#181818] lg:text-[28px]">
                  {block.title}
                </h3>
                <p className="m-0 leading-relaxed text-[#55524E]">{block.text}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
