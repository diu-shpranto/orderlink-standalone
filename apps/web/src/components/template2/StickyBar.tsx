// টেমপ্লেট ২-এর মোবাইল স্টিকি বার — ফোনে নিচে আটকে থাকে:
// "অর্ডার করুন ৳দাম" বোতাম, ফর্মে স্ক্রল করে। iOS safe-area
// inset মেনে চলে; ডেস্কটপে দেখায় না।
import { bdt, FOCUS_RING } from './helpers.ts'

export default function TemplateTwoStickyBar({ price }: { price: number }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#EAE7E1] bg-white px-4 pb-[calc(10px+env(safe-area-inset-bottom,0px))] pt-2.5 lg:hidden">
      <a
        href="#order"
        className={`block min-h-[56px] w-full rounded-[4px] bg-[#294C3C] px-4 py-[15px] text-center text-xl font-bold text-white no-underline hover:bg-[#1F3D2F] ${FOCUS_RING}`}
      >
        অর্ডার করুন {bdt(price)}
      </a>
    </div>
  )
}
