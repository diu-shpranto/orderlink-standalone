// টেমপ্লেট ১-এর স্পেসিফিকেশন — একটার পর একটা সবুজ-টিন্ট সারি
// (লেবেল সবুজ, মান কালি রং), সিম্যান্টিক <dl>। মোবাইলে
// লেবেল মানের ওপরে বসে।
import type { TemplateOneSpec } from './types.ts'

export default function TemplateOneSpecs({
  specs,
}: {
  specs: TemplateOneSpec[]
}) {
  if (specs.length === 0) return null
  return (
    <section className="py-7">
      <h2 className="mb-5 text-2xl font-bold min-[861px]:text-[28px]">
        স্পেসিফিকেশন
      </h2>
      <dl className="m-0 overflow-hidden rounded-[18px] border border-[#DCE5DF] bg-white">
        {specs.map((spec, i) => (
          <div
            key={spec.label}
            className={`grid grid-cols-1 gap-0 px-4 py-3 min-[861px]:grid-cols-[220px_1fr] min-[861px]:px-[22px] min-[861px]:py-3.5 ${
              i % 2 === 0 ? 'bg-[#E8F3EC]' : ''
            }`}
          >
            <dt className="font-semibold text-[#0B5D3B]">{spec.label}</dt>
            <dd className="m-0">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
