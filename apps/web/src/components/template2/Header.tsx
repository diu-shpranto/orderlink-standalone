// টেমপ্লেট ২-এর স্টোর হেডার — বাঁয়ে লোগো + দোকানের নাম, মাঝে
// মিনিমাল ন্যাভিগেশন (ডেস্কটপে), ডানে ফোন (কল নাও) + WhatsApp।
// মোবাইলে ন্যাভিগেশন লুকিয়ে থাকে, ফোন নম্বরের বদলে শুধু কল
// আইকন দেখায় — হেডার ছোট ও পরিপাটি থাকে।
import { displayPhone, FOCUS_RING, telHref, whatsappHref } from './helpers.ts'
import { ChatIcon, PhoneIcon } from './icons.tsx'
import type { TemplateTwoSeller } from './types.ts'

const NAV_LINKS = [
  { label: 'নতুন সংগ্রহ', href: '#hero' },
  { label: 'পুরুষ', href: '#story' },
  { label: 'নারী', href: '#lifestyle' },
  { label: 'কালেকশন', href: '#highlights' },
]

export default function TemplateTwoHeader({
  seller,
}: {
  seller: TemplateTwoSeller
}) {
  return (
    <header className="border-b border-[#EAE7E1] bg-white">
      <div className="mx-auto flex h-[60px] max-w-[1240px] items-center justify-between gap-3 px-4 lg:h-[72px] lg:px-6">
        <a
          href="#hero"
          className={`flex min-w-0 items-center gap-2.5 text-[17px] font-bold text-[#181818] no-underline lg:text-xl ${FOCUS_RING}`}
        >
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
          <span className="truncate font-serif">{seller.name}</span>
        </a>

        <nav
          aria-label="দোকানের ন্যাভিগেশন"
          className="hidden items-center gap-7 lg:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-[15px] font-medium text-[#77736F] no-underline hover:text-[#181818] ${FOCUS_RING}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <span className="flex shrink-0 items-center gap-2">
          {seller.whatsapp ? (
            <a
              href={whatsappHref(seller.whatsapp)}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp-এ যোগাযোগ করুন"
              className={`grid h-11 w-11 place-items-center rounded-full bg-[#294C3C] text-white ${FOCUS_RING}`}
            >
              <ChatIcon />
            </a>
          ) : null}
          {seller.phone ? (
            <a
              href={telHref(seller.phone)}
              aria-label={`এখনই কল করুন ${displayPhone(seller.phone)}`}
              className={`flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] border-[#294C3C] px-4 py-2 text-[15px] font-semibold text-[#181818] no-underline lg:min-h-[48px] max-lg:px-2.5 ${FOCUS_RING}`}
            >
              <PhoneIcon className="h-[18px] w-[18px] text-[#294C3C]" />
              <span className="max-lg:hidden">
                {displayPhone(seller.phone)}
              </span>
              <span className="hidden text-[#294C3C] max-lg:hidden lg:inline">
                · কল করুন
              </span>
            </a>
          ) : null}
        </span>
      </div>
    </header>
  )
}
