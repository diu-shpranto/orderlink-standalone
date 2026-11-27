// Orderlink লোগো — আসল লোগো ছবি (সবুজ লুপ + লাল ঊর্ধ্বমুখী তীর, "Order" সবুজ + "link" লাল)।
// ছবিগুলো public/ থেকে আসে: orderlink-logo.png (স্বচ্ছ, হালকা ব্যাকগ্রাউন্ডে),
// orderlink-mark.png (শুধু লুপ+তীর, বর্গাকার), orderlink-logo-tile.png (সাদা টাইল, গাঢ় ব্যাকগ্রাউন্ডে)।

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

/** আসল লোগোর শুধু লুপ+তীর চিহ্ন — সেলার প্যানেলের রেল, দোকানের কার্ড ও মোবাইল টপ বারে। */
export function LogoTile({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/orderlink-mark.png"
      alt=""
      width={size}
      height={size}
      className="shrink-0"
      aria-hidden="true"
    />
  )
}

export function LogoWordmark({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/orderlink-logo.png"
      alt="Orderlink"
      style={{ height: size }}
      className="w-auto shrink-0"
    />
  )
}
