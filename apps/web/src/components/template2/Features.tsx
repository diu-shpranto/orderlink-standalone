// টেমপ্লেট ২-এর ফিচার সেকশন — বাঁয়ে বড় ছবি, ডানে ফিচারের
// সারি (মিনিমাল আইকন + শিরোনাম + ছোট বিবরণ)। পরিচ্ছন্ন,
// অগোছালো নয়। ছবি না থাকলে প্লেসহোল্ডার ব্লক দেখায়।
// খালি থাকলে সেকশন আসে না।
import { TemplateTwoIcon } from './icons.tsx'
import TemplateTwoPlaceholderImage from './PlaceholderImage.tsx'
import type { TemplateTwoFeature, TemplateTwoImage } from './types.ts'

export default function TemplateTwoFeatures({
  features,
  image,
}: {
  features: TemplateTwoFeature[]
  image?: TemplateTwoImage | null
}) {
  if (features.length === 0) return null
  return (
    <section className="py-10 lg:py-14">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <div>
          {image?.url ? (
            <img
              src={image.url}
              alt={image.alt}
              className="block aspect-[4/3] w-full rounded-[4px] border border-[#EAE7E1] object-cover"
            />
          ) : (
            <TemplateTwoPlaceholderImage
              label={image?.label ?? 'পণ্যের বৈশিষ্ট্য'}
              className="aspect-[4/3] w-full rounded-[4px] border border-[#EAE7E1]"
            />
          )}
        </div>
        <div>
          <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#294C3C]">
            বৈশিষ্ট্য
          </p>
          <h2 className="m-0 mb-7 font-serif text-[28px] font-bold leading-tight text-[#181818] lg:text-4xl">
            যা এই পণ্যকে আলাদা করে
          </h2>
          <div className="grid gap-5">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E9EEE9] text-[#294C3C]">
                  <TemplateTwoIcon kind={f.icon} className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="m-0 mb-1 font-serif text-lg font-bold text-[#181818]">
                    {f.title}
                  </h3>
                  <p className="m-0 text-[15px] leading-relaxed text-[#77736F]">
                    {f.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
