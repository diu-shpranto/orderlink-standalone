// টেমপ্লেট ১-এর হেডার — বাঁয়ে সেলারের লোগো + নাম, ডানে ফোন
// (tel: লিংক)। মোবাইলে ফোন নম্বর লুকিয়ে শুধু কল আইকন থাকে।
import { displayPhone, FOCUS_RING, telHref } from './helpers.ts'
import type { TemplateOneSeller } from './types.ts'

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px] shrink-0 fill-[#0B5D3B]"
    >
      <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z" />
    </svg>
  )
}

export default function TemplateOneHeader({
  seller,
}: {
  seller: TemplateOneSeller
}) {
  return (
    <header className="border-b border-[#DCE5DF] bg-white">
      <div className="mx-auto flex h-[60px] max-w-[1160px] items-center justify-between gap-3 px-4 min-[861px]:h-[68px] min-[861px]:px-5">
        <span className="flex min-w-0 items-center gap-2.5 text-[17px] font-bold text-[#0B5D3B] min-[861px]:text-xl">
          {seller.logoUrl ? (
            <img
              src={seller.logoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0B5D3B]">
              <span aria-hidden="true" className="block h-4 w-4 rounded-full bg-[#D7263D]" />
            </span>
          )}
          <span className="truncate">{seller.name}</span>
        </span>
        {seller.phone ? (
          <a
            href={telHref(seller.phone)}
            aria-label={`ফোন করুন ${displayPhone(seller.phone)}`}
            className={`flex min-h-[48px] items-center gap-2 rounded-full border-[1.5px] border-[#0B5D3B] px-4 py-2 font-semibold text-[#14211A] no-underline max-[860px]:px-[9px] ${FOCUS_RING}`}
          >
            <PhoneIcon />
            <span className="max-[860px]:hidden">
              {displayPhone(seller.phone)}
            </span>
          </a>
        ) : null}
      </div>
    </header>
  )
}
