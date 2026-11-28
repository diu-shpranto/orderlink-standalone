// টেমপ্লেট ২-এর সেলার ব্র্যান্ড ফুটার — দোকানের লোগো + নাম,
// ফোন, WhatsApp, ঠিকানা, সোশ্যাল লিংক, নীতিমালা, কপিরাইট।
// সব তথ্য সেলারের নিজের; OrderLink অ্যাডমিনের কোনো তথ্য
// এখানে দেখায় না। তথ্য না থাকলে সেই লাইন আসে না।
import { bn, displayPhone, FOCUS_RING, telHref, whatsappHref } from './helpers.ts'
import { ChatIcon, PhoneIcon } from './icons.tsx'
import type { TemplateTwoSeller } from './types.ts'

export default function TemplateTwoFooter({
  seller,
}: {
  seller: TemplateTwoSeller
}) {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-[#181818] text-[#D8D2C8]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-8 px-4 py-12 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-6">
        <div>
          <p className="m-0 flex items-center gap-2.5 text-xl font-bold text-white">
            {seller.logoUrl ? (
              <img
                src={seller.logoUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#294C3C] font-serif text-lg text-white">
                {seller.name.charAt(0)}
              </span>
            )}
            <span className="font-serif">{seller.name}</span>
          </p>
          {seller.address ? (
            <p className="m-0 mt-4 max-w-[320px] leading-relaxed">
              {seller.address}
            </p>
          ) : null}
          <p className="m-0 mt-4 flex flex-wrap gap-3">
            {seller.facebook ? (
              <a
                href={seller.facebook}
                target="_blank"
                rel="noreferrer"
                className={`rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white no-underline hover:border-white ${FOCUS_RING}`}
              >
                Facebook
              </a>
            ) : null}
            {seller.instagram ? (
              <a
                href={seller.instagram}
                target="_blank"
                rel="noreferrer"
                className={`rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white no-underline hover:border-white ${FOCUS_RING}`}
              >
                Instagram
              </a>
            ) : null}
          </p>
        </div>

        <div>
          <h2 className="m-0 mb-4 font-serif text-lg font-bold text-white">
            যোগাযোগ
          </h2>
          {seller.phone ? (
            <p className="m-0 mb-2.5">
              <a
                href={telHref(seller.phone)}
                className={`inline-flex items-center gap-2 text-[#D8D2C8] no-underline hover:text-white ${FOCUS_RING}`}
              >
                <PhoneIcon className="h-4 w-4" />
                {displayPhone(seller.phone)}
              </a>
            </p>
          ) : null}
          {seller.whatsapp ? (
            <p className="m-0">
              <a
                href={whatsappHref(seller.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 text-[#D8D2C8] no-underline hover:text-white ${FOCUS_RING}`}
              >
                <ChatIcon className="h-4 w-4" />
                WhatsApp-এ মেসেজ করুন
              </a>
            </p>
          ) : null}
        </div>

        <div>
          <h2 className="m-0 mb-4 font-serif text-lg font-bold text-white">
            নীতিমালা
          </h2>
          <p className="m-0 mb-2.5">
            <a
              href="#delivery"
              className={`text-[#D8D2C8] no-underline hover:text-white ${FOCUS_RING}`}
            >
              ফেরত নীতি
            </a>
          </p>
          <p className="m-0 text-[#D8D2C8]">প্রাইভেসি পলিসি</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto m-0 max-w-[1240px] px-4 py-5 text-center text-sm text-[#A8A29A] lg:px-6">
          © {bn(year)} {seller.name}। সর্বস্বত্ব সংরক্ষিত।
        </p>
      </div>
    </footer>
  )
}
