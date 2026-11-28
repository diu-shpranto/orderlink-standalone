// টেমপ্লেট ২-এর ছবির প্লেসহোল্ডার — আসল পণ্যের ছবি না থাকলে
// (নমুনা ডাটায়) এই নরম বেইজ ব্লক দেখায়: পোশাকের সিলুয়েট +
// ছবির পরিচয় + "নমুনা ছবি" ট্যাগ। কোনো বাইরের ছবি হটলিংক
// করে না; সেলারের আসল ছবি এলে <img>-এ বদলে যাবে।
export default function TemplateTwoPlaceholderImage({
  label,
  className = '',
}: {
  label: string
  className?: string
}) {
  return (
    <div
      aria-label={`${label} — নমুনা ছবি`}
      className={`relative grid place-items-center overflow-hidden bg-[#EFEAE3] ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,#F7F3EC_0%,#EFEAE3_55%,#E6DFD3_100%)]"
      />
      <span className="relative flex flex-col items-center gap-2 px-4 text-center">
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
          className="h-16 w-16 text-[#294C3C] opacity-70 lg:h-20 lg:w-20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M24 10q8 6 16 0" />
          <path d="M40 10l10 4 10 10-8 8-4-4" />
          <path d="M48 28v26q0 4-4 4H20q-4 0-4-4V28" />
          <path d="M24 10 14 14 4 24l8 8 4-4" />
          <path d="M32 18v6" />
        </svg>
        <span className="text-sm font-semibold tracking-wide text-[#294C3C]">
          {label}
        </span>
        <span className="text-xs text-[#77736F]">ছবি আসবে</span>
      </span>
      <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[#77736F]">
        নমুনা ছবি
      </span>
    </div>
  )
}
