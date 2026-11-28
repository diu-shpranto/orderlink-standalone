// টেমপ্লেট ২-এর ডেলিভারি ও রিটার্ন তথ্য — ডেলিভারির সময়,
// চার্জ, পেমেন্ট, সাইজ পরিবর্তন, ফেরত, কাস্টমার সাপোর্টের
// ৬টি কার্ড। লেখা ডাটা থেকে আসে, তাই সেলার বদলাতে পারে।
// ডেলিভারি চার্জ দোকানের আসল চার্জ থেকে আসে। কোনো কার্ডের
// লেখা না থাকলে সেই কার্ড দেখায় না; সব খালি থাকলে পুরো
// সেকশন আসে না।
import { bdt } from './helpers.ts'
import type { TemplateTwoProduct } from './types.ts'

export default function TemplateTwoDeliveryInfo({
  product,
}: {
  product: TemplateTwoProduct
}) {
  const info = product.deliveryInfo
  const cards: { title: string; text: string }[] = []
  if (info.deliveryTime)
    cards.push({ title: 'ডেলিভারির সময়', text: info.deliveryTime })
  cards.push({
    title: 'ডেলিভারি চার্জ',
    text: `ঢাকার ভিতরে ${bdt(product.deliveryCharges.inside)}, ঢাকার বাইরে ${bdt(product.deliveryCharges.outside)}`,
  })
  if (info.payment) cards.push({ title: 'পেমেন্ট', text: info.payment })
  if (info.exchange)
    cards.push({ title: 'সাইজ পরিবর্তন', text: info.exchange })
  if (info.returnPolicy)
    cards.push({ title: 'ফেরত নীতি', text: info.returnPolicy })
  if (info.support)
    cards.push({ title: 'কাস্টমার সাপোর্ট', text: info.support })
  if (cards.length === 0) return null

  return (
    <section id="delivery" className="scroll-mt-6 py-10 lg:py-14">
      <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#294C3C]">
        জানা ভালো
      </p>
      <h2 className="m-0 mb-7 font-serif text-[28px] font-bold leading-tight text-[#181818] lg:text-4xl">
        ডেলিভারি ও রিটার্ন তথ্য
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-[4px] border border-[#EAE7E1] bg-white p-6"
          >
            <h3 className="m-0 mb-1.5 font-serif text-lg font-bold text-[#181818]">
              {card.title}
            </h3>
            <p className="m-0 text-[15px] leading-relaxed text-[#77736F]">
              {card.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
