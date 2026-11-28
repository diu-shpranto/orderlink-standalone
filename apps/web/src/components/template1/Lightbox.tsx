// টেমপ্লেট ১-এর লাইটবক্স — পুরো পর্দা, গাঢ় ওভারলে। আগের/
// পরের বোতাম, বন্ধ বোতাম, Esc-এ বন্ধ, ←/→-তে ছবি বদল,
// ওভারলেতে ক্লিক করলে বন্ধ। ফোকাস ভেতরে আটকে থাকে (ট্র্যাপ),
// বন্ধ হলে আগের জায়গায় ফোকাস ফিরে যায়।
import { useEffect, useRef } from 'react'
import { FOCUS_RING } from './helpers.ts'
import type { TemplateOneImage } from './types.ts'

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
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        navigateRef.current(1)
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

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="বড় ছবি"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(10,24,17,0.88)] p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
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
      <button
        type="button"
        aria-label="আগের ছবি"
        onClick={() => onNavigate(-1)}
        className={`absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white text-2xl leading-none text-[#14211A] ${FOCUS_RING}`}
      >
        ‹
      </button>
      <div className="relative grid aspect-square w-[min(88vw,640px)] place-items-center overflow-hidden rounded-3xl bg-[#E8F3EC]">
        <span
          aria-hidden="true"
          className="absolute aspect-square w-[68%] rounded-full bg-[#D7263D]"
        />
        <img
          src={current.url}
          alt={current.alt}
          className="relative h-[90%] w-[90%] object-contain"
        />
      </div>
      <button
        type="button"
        aria-label="পরের ছবি"
        onClick={() => onNavigate(1)}
        className={`absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-white text-2xl leading-none text-[#14211A] ${FOCUS_RING}`}
      >
        ›
      </button>
    </div>
  )
}
