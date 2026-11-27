// Orderlink লোগো — সবুজ লুপ + লাল ঊর্ধ্বমুখী তীর, "Order" সবুজ + "link" লাল।

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 5a15 15 0 1 0 15 15"
        stroke="#006a4e"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M20 32V13M13 20l7-7 7 7"
        stroke="#f42a41"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LogoWordmark({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="text-2xl font-extrabold tracking-tight">
        <span className="text-brand">Order</span>
        <span className="text-accent">link</span>
      </span>
    </span>
  )
}
