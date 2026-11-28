// টেমপ্লেট ২-এর FAQ — মসৃণ অ্যাকর্ডিয়ন (একবারে একটা প্রশ্ন
// খোলে)। প্রশ্নোত্তর ডাটা থেকে আসে। খালি থাকলে সেকশন আসে না।
import { useState } from 'react'
import { FOCUS_RING } from './helpers.ts'
import type { TemplateTwoFaq } from './types.ts'

export default function TemplateTwoFaq({ faqs }: { faqs: TemplateTwoFaq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  if (faqs.length === 0) return null
  return (
    <section className="py-10 lg:py-14">
      <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#294C3C]">
        জিজ্ঞাসা
      </p>
      <h2 className="m-0 mb-7 font-serif text-[28px] font-bold leading-tight text-[#181818] lg:text-4xl">
        সচরাচর জিজ্ঞাসা
      </h2>
      <div className="grid gap-3">
        {faqs.map((faq, i) => {
          const open = openIndex === i
          return (
            <div
              key={faq.q}
              className="overflow-hidden rounded-[4px] border border-[#EAE7E1] bg-white"
            >
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`t2-faq-${i}`}
                  onClick={() => setOpenIndex(open ? null : i)}
                  className={`flex w-full min-h-[56px] items-center justify-between gap-4 bg-transparent px-5 py-4 text-left text-[17px] font-semibold text-[#181818] ${FOCUS_RING}`}
                >
                  {faq.q}
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-2xl leading-none text-[#294C3C] transition-transform duration-200 ${
                      open ? 'rotate-45' : ''
                    }`}
                  >
                    +
                  </span>
                </button>
              </h3>
              {open ? (
                <p
                  id={`t2-faq-${i}`}
                  className="m-0 border-t border-[#EAE7E1] px-5 py-4 leading-relaxed text-[#55524E]"
                >
                  {faq.a}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
