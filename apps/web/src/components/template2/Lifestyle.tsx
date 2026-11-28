// টেমপ্লেট ২-এর স্টাইলিং/লাইফস্টাইল সেকশন — পুরো প্রস্থের
// নরম সবুজ ব্যান্ডে বড় লাইফস্টাইল ছবি + স্টাইলিংয়ের
// সংমিশ্রণ, প্রতিটার নিচে এডিটোরিয়াল ক্যাপশন। ছবি না থাকলে
// প্লেসহোল্ডার ব্লক দেখায়। খালি থাকলে সেকশন আসে না।
import TemplateTwoPlaceholderImage from './PlaceholderImage.tsx'
import type { TemplateTwoLifestyle } from './types.ts'

export default function TemplateTwoLifestyle({
  items,
}: {
  items: TemplateTwoLifestyle[]
}) {
  if (items.length === 0) return null
  const [feature, ...rest] = items
  return (
    <section id="lifestyle" className="scroll-mt-6 bg-[#E9EEE9] py-10 lg:py-14">
      <div className="mx-auto max-w-[1240px] px-4 lg:px-6">
        <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#294C3C]">
          স্টাইলিং
        </p>
        <h2 className="m-0 mb-7 font-serif text-[28px] font-bold leading-tight text-[#181818] lg:text-4xl">
          যেভাবে পরবেন, যেভাবে মানাবে
        </h2>
        {feature ? (
          <figure className="m-0">
            {feature.imageUrl ? (
              <img
                src={feature.imageUrl}
                alt={feature.imageLabel}
                className="block aspect-[16/9] w-full rounded-[4px] border border-[#EAE7E1] object-cover"
              />
            ) : (
              <TemplateTwoPlaceholderImage
                label={feature.imageLabel}
                className="aspect-[16/9] w-full rounded-[4px] border border-[#EAE7E1]"
              />
            )}
            <figcaption className="mt-3 font-serif text-lg italic text-[#55524E]">
              {feature.caption}
            </figcaption>
          </figure>
        ) : null}
        {rest.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((item) => (
              <figure key={item.caption} className="m-0">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.imageLabel}
                    className="block aspect-[4/3] w-full rounded-[4px] border border-[#EAE7E1] object-cover"
                  />
                ) : (
                  <TemplateTwoPlaceholderImage
                    label={item.imageLabel}
                    className="aspect-[4/3] w-full rounded-[4px] border border-[#EAE7E1]"
                  />
                )}
                <figcaption className="mt-2.5 text-[15px] font-medium text-[#55524E]">
                  {item.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
