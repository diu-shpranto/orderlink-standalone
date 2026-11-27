// ছবির ফ্রেম — ছবির আসল অনুপাতে (natural aspect ratio), কোনো
// ঝাপসা কপি নেই। ছবি কখনো ক্রপ হয় না, ফ্রেমের কিনারা পর্যন্ত
// ভরে দেখায়। খুব লম্বা ছবিতে সর্বোচ্চ উচ্চতা ৬২০px — তার বেশি
// হলে ছবি মাঝখানে পুরোটা দেখায় (পাশ স্বচ্ছ, ঝাপসা নয়)।

import { useEffect, useRef, useState } from 'react'

export default function FramedPhoto({
  src,
  alt,
  className = '',
}: {
  src: string
  alt: string
  className?: string
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [ratio, setRatio] = useState<string | null>(null)

  // ক্যাশে থাকা ছবিতে onLoad না-ও ডাকতে পারে — তাই লোড হয়ে
  // থাকলে এখানেই অনুপাত নেওয়া হয়।
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 0) {
      setRatio(`${img.naturalWidth} / ${img.naturalHeight}`)
    }
  }, [src])

  return (
    <div
      className={`relative max-h-[620px] w-full overflow-hidden ${className}`}
      style={ratio ? { aspectRatio: ratio } : { aspectRatio: '4 / 3' }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={(e) => {
          const t = e.currentTarget
          if (t.naturalWidth > 0) {
            setRatio(`${t.naturalWidth} / ${t.naturalHeight}`)
          }
        }}
        className="absolute inset-0 h-full w-full object-contain"
      />
    </div>
  )
}
