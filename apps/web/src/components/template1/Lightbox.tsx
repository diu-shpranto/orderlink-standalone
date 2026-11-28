// টেমপ্লেট ১-এর লাইটবক্স — পুরো পর্দা, গাঢ় ওভারলে। আগের/
// পরের বোতাম, বন্ধ বোতাম, Esc-এ বন্ধ, ←/→-তে ছবি বদল,
// ওভারলেতে ক্লিক করলে বন্ধ। ফোকাস ভেতরে আটকে থাকে (ট্র্যাপ),
// বন্ধ হলে আগের জায়গায় ফোকাস ফিরে যায়।
// জুম: ＋/－ বোতাম আর ছবিতে ট্যাপে ১× ↔ ২×; জুম করলে স্ক্রল
// করে ঘুরে দেখা যায়। মোবাইলে সোয়াইপে ছবি বদলায়।
import { useEffect, useRef, useState } from 'react'
import { bn, FOCUS_RING } from './helpers.ts'
import type { TemplateOneImage } from './types.ts'

const ZOOM_LEVELS = [1, 1.5, 2, 2.5]
const SWIPE_MIN_PX = 50

export default function TemplateOneLightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: TemplateOneImage[]
  index: number
  onClose: () => void
  onNavigate: (direction: 1 | -1) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const navigateRef = useRef(onNavigate)
  navigateRef.current = onNavigate
  const [zoomIndex, setZoomIndex] = useState(0)
  const zoom = ZOOM_LEVELS[zoomIndex] ?? 1
  const touchStartX = useRef<number | null>(null)
  // সোয়াইপের ঠিক পরের ক্লিকটা (টাচের পর ব্রাউজার যে ক্লিক
  // পাঠায়) ওভারলে বন্ধ করবে না — তবে শুধু ৩৫০ মিলিসেকেন্ডের
  // মধ্যে; তার পরে ট্যাপ করলে স্বাভাবিকভাবে বন্ধ হবে।
  const lastSwipeAt = useRef(0)

  const navigate = (direction: 1 | -1) => {
    setZoomIndex(0)
    navigateRef.current(direction)
  }

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const root = rootRef.current
    root
      ?.querySelector<HTMLButtonElement>('[data-lb-close]')
      ?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        navigateRef.current(-1)
        setZoomIndex(0)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        navigateRef.current(1)
        setZoomIndex(0)
      } else if (event.key === 'Tab' && root) {
        const focusables = [
          ...root.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
          ),
        ].filter((el) => !el.hasAttribute('disabled'))
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [])

  const current = images[index] ?? images[0]
  if (!current) return null

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartX.current
    touchStartX.current = null
    if (startX === null || images.length < 2) return
    const dx = (e.changedTouches[0]?.clientX ?? startX) - startX
    if (Math.abs(dx) < SWIPE_MIN_PX) return
    lastSwipeAt.current = Date.now()
    navigate(dx < 0 ? 1 : -1)
  }
  const onOverlayClick = (event: React.MouseEvent) => {
    if (Date.now() - lastSwipeAt.current < 350) return
    if (event.target === event.currentTarget) onClose()
  }
  const toggleZoom = () => {
    setZoomIndex((z) => (z === 0 ? 2 : 0))
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="বড় ছবি"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(10,24,17,0.88)] p-4"
      onClick={onOverlayClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        data-lb-close
        aria-label="বন্ধ করুন"
        onClick={onClose}
        className={`absolute right-3.5 top-3.5 h-12 w-12 rounded-full bg-white text-2xl leading-none text-[#14211A] ${FOCUS_RING}`}
      >
        ×
      </button>
      <div className="absolute left-3.5 top-3.5 flex items-center gap-2">
        <button
          type="button"
          aria-label="ছোট করুন"
          disabled={zoomIndex <= 0}
          onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
          className={`h-12 w-12 rounded-full bg-white text-2xl leading-none text-[#14211A] disabled:opacity-40 ${FOCUS_RING}`}
        >
          −
        </button>
        <span
          aria-live="polite"
          className="min-w-[52px] rounded-full bg-white px-2 py-2 text-center text-sm font-bold text-[#14211A]"
        >
          {bn(Math.round(zoom * 100))}%
        </span>
        <button
          type="button"
          aria-label="বড় করুন"
          disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
          onClick={() =>
            setZoomIndex((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))
          }
          className={`h-12 w-12 rounded-full bg-white text-2xl leading-none text-[#14211A] disabled:opacity-40 ${FOCUS_RING}`}
        >
          ＋
        </button>
      </div>
      <button
        type="button"
        aria-label="আগের ছবি"
        onClick={() => navigate(-1)}
        className={`absolute left-3 top-1/2 z-10 h-12 w-12 -translate-y-1/2 rounded-full bg-white text-2xl leading-none text-[#14211A] ${FOCUS_RING}`}
      >
        ‹
      </button>
      <div
        className={`relative grid aspect-square w-[min(88vw,640px)] place-items-center rounded-3xl bg-[#E8F3EC] ${
          zoom > 1 ? 'overflow-auto' : 'overflow-hidden'
        }`}
      >
        <span
          aria-hidden="true"
          className="absolute aspect-square w-[68%] rounded-full bg-[#D7263D]"
        />
        <img
          src={current.url}
          alt={current.alt}
          onClick={toggleZoom}
          style={{ transform: `scale(${zoom})` }}
          className="relative h-[90%] w-[90%] cursor-zoom-in object-contain transition-transform duration-200"
        />
      </div>
      <button
        type="button"
        aria-label="পরের ছবি"
        onClick={() => navigate(1)}
        className={`absolute right-3 top-1/2 z-10 h-12 w-12 -translate-y-1/2 rounded-full bg-white text-2xl leading-none text-[#14211A] ${FOCUS_RING}`}
      >
        ›
      </button>
    </div>
  )
}
