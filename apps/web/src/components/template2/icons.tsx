// টেমপ্লেট ২-এর ছোট SVG আইকন — হালকা স্ট্রোকের এডিটোরিয়াল
// চিহ্ন (কাপড়, ফিট, ডিজাইন, ফিনিশিং, যত্ন)। fill নয়, stroke।
import type { TemplateTwoIconKind } from './types.ts'

export function TemplateTwoIcon({
  kind,
  className = 'h-6 w-6',
}: {
  kind: TemplateTwoIconKind
  className?: string
}) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className,
  }
  switch (kind) {
    case 'fabric':
      // স্তরে স্তরে কাপড়
      return (
        <svg {...common}>
          <path d="M12 2 2 7l10 5 10-5-10-5Z" />
          <path d="m2 17 10 5 10-5" />
          <path d="m2 12 10 5 10-5" />
        </svg>
      )
    case 'fit':
      // মানানসই ফিট — টিক চিহ্নের বৃত্ত
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="m8 12.5 2.7 2.7L16.5 9" />
        </svg>
      )
    case 'design':
      // ডিজাইন — ঝলকানি তারা
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 2l2.2 7.3L22 12l-7.8 2.7L12 22l-2.2-7.3L2 12l7.8-2.7L12 2Z" />
        </svg>
      )
    case 'finish':
      // ফিনিশিং — ব্যাজ/পদক
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="6" />
          <path d="m9 14.5-1.5 6L12 17.5l4.5 3L15 14.5" />
        </svg>
      )
    case 'care':
      // যত্ন — পানির ফোঁটা
      return (
        <svg {...common}>
          <path d="M12 2.7s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 9.7 12 2.7 12 2.7Z" />
        </svg>
      )
  }
}

export function PhoneIcon({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${className} shrink-0 fill-current`}
    >
      <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z" />
    </svg>
  )
}

export function ChatIcon({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} shrink-0`}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}
