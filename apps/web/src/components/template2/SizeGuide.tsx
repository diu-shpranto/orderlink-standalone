// টেমপ্লেট ২-এর সাইজ গাইড — মাপের টেবিল (সাইজ | বুক | দৈর্ঘ্য
// | কাঁধ) + সহজ ব্যাখ্যা। টেবিলটা মোবাইলে অনুভূমিকভাবে স্ক্রল
// হয় (overflow-x-auto), পেজের লেআউট ভাঙে না। মাপ ডাটা থেকে
// আসে — সেলার নিজের মাপ বসাতে পারে। খালি থাকলে সেকশন আসে না।
import type { TemplateTwoSizeGuideRow } from './types.ts'

export default function TemplateTwoSizeGuide({
  rows,
  note,
}: {
  rows: TemplateTwoSizeGuideRow[]
  note?: string
}) {
  if (rows.length === 0) return null
  return (
    <section id="size-guide" className="scroll-mt-6 py-10 lg:py-14">
      <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#294C3C]">
        সঠিক মাপ
      </p>
      <h2 className="m-0 mb-3 font-serif text-[28px] font-bold leading-tight text-[#181818] lg:text-4xl">
        সাইজ গাইড
      </h2>
      {note ? (
        <p className="m-0 mb-6 max-w-[720px] leading-relaxed text-[#77736F]">
          {note}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-[4px] border border-[#EAE7E1] bg-white">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="bg-[#294C3C] text-white">
              <th scope="col" className="px-5 py-3.5 font-semibold">
                সাইজ
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                বুক
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                দৈর্ঘ্য
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                কাঁধ
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.size}
                className={i % 2 === 0 ? 'bg-[#E9EEE9]' : 'bg-white'}
              >
                <th scope="row" className="px-5 py-3.5 font-bold text-[#181818]">
                  {row.size}
                </th>
                <td className="px-5 py-3.5">{row.chest}</td>
                <td className="px-5 py-3.5">{row.length}</td>
                <td className="px-5 py-3.5">{row.shoulder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="m-0 mt-3 text-sm text-[#77736F]">
        সব মাপ ইঞ্চিতে। দুই সাইজের মাঝামাঝি হলে এক সাইজ বড় নেওয়াই ভালো।
      </p>
    </section>
  )
}
