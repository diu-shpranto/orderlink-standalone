// ছবির ফ্রেম — সব ছবি একই 4:3 ফ্রেমে, object-contain,
// পেছনে ঝাপসা কপি (blurred-copy fill)। ছবি কখনো অটো-ক্রপ হয় না।

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
      className={`relative aspect-[4/3] w-full overflow-hidden bg-gray-100 ${className}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-md brightness-90"
      />
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain"
      />
    </div>
  )
}
