// ছবির ফ্রেম — সব টেমপ্লেটে একই ৪:৩ ফরম্যাট। ছবি ফ্রেম ভরে দেখায়
// (object-cover) — আসল ছবির অনুপাত যাই হোক, ফ্রেম সব জায়গায়
// একই থাকে। ছবিতে ক্লিক করলে আসল সাইজের ছবি দেখায় (লাইটবক্স) —
// সেটা Gallery কম্পোনেন্টে (CustomerPage.tsx) বাঁধা আছে।

export default function FramedPhoto({
  src,
  alt,
  className = '',
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  )
}
