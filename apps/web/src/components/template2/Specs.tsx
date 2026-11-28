// টেমপ্লেট ২-এর পণ্যের বিবরণ (স্পেসিফিকেশন) — লেবেল/মানের
// সুন্দর সারি (একটার পর একটা নরম টিন্ট), সিম্যান্টিক <dl>।
// মোবাইলে লেবেল মানের ওপরে বসে। স্পেসিফিকেশন ডাটা থেকে আসে,
// তাই পোশাক/জুতা/অ্যাকসেসরিজ যেকোনো পণ্যের ক্ষেত্রেই প্রাসঙ্গিক
// লাইনগুলোই দেখায়। খালি থাকলে সেকশন আসে না।
import type { TemplateTwoSpec } from './types.ts'

export default function TemplateTwoSpecs({
  specs,
}: {
  specs: TemplateTwoSpec[]
}) {
  if (specs.length === 0) return null
  return (
    <section className="py-10 lg:py-14">
      <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#294C3C]">
        বিস্তারিত
      </p>
      <h2 className="m-0 mb-7 font-serif text-[28px] font-bold leading-tight text-[#181818] lg:text-4xl">
        পণ্যের বিবরণ
      </h2>
      <dl className="m-0 overflow-hidden rounded-[4px] border border-[#EAE7E1] bg-white">
        {specs.map((spec, i) => (
          <div
            key={spec.label}
            className={`grid grid-cols-1 gap-0 px-5 py-3.5 lg:grid-cols-[240px_1fr] lg:px-7 lg:py-4 ${
              i % 2 === 0 ? 'bg-[#E9EEE9]' : ''
            }`}
          >
            <dt className="font-semibold text-[#294C3C]">{spec.label}</dt>
            <dd className="m-0 text-[#181818]">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
