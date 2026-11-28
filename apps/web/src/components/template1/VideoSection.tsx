// টেমপ্লেট ১-এর ভিডিও সেকশন — ঐচ্ছিক: চালানোর মতো ভিডিও
// না থাকলে কিছুই দেখায় না (শিরোনামও না)। একাধিক ভিডিও
// থাকলে নিচে থাম্বনেইলের তালিকা — ট্যাপ করলে ভিডিও বদলায়।
// শুধু YouTube লিংক চলে (watch / youtu.be / shorts / embed)।
import { bn, FOCUS_RING, youtubeEmbedId } from './helpers.ts'
import type { TemplateOneVideo } from './types.ts'

export default function TemplateOneVideoSection({
  videos,
  productName,
  activeIndex,
  onSelect,
  autoplay,
}: {
  videos: TemplateOneVideo[]
  productName: string
  activeIndex: number
  onSelect: (index: number) => void
  autoplay: boolean
}) {
  const playable = videos
    .map((v) => ({ ...v, id: youtubeEmbedId(v.url) }))
    .filter((v): v is TemplateOneVideo & { id: string } => v.id !== null)
  if (playable.length === 0) return null
  const current = playable[Math.min(activeIndex, playable.length - 1)]

  return (
    <section id="video" className="scroll-mt-6 py-7">
      <h2 className="mb-5 text-2xl font-bold min-[861px]:text-[28px]">
        ভিডিও
      </h2>
      <div className="aspect-video w-full overflow-hidden rounded-[18px] border border-[#DCE5DF] bg-[#14211A]">
        <iframe
          key={current.id}
          src={`https://www.youtube.com/embed/${current.id}${autoplay ? '?autoplay=1' : ''}`}
          title={
            current.label
              ? `${productName} — ${current.label}`
              : productName
          }
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {playable.length > 1 ? (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {playable.map((v, i) => (
            <button
              key={`${v.id}-${i}`}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={v.label ?? `ভিডিও ${bn(i + 1)}`}
              aria-current={i === activeIndex}
              className={`relative w-32 shrink-0 overflow-hidden rounded-xl border-2 ${
                i === activeIndex ? 'border-[#0B5D3B]' : 'border-transparent'
              } ${FOCUS_RING}`}
            >
              <img
                src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                alt=""
                className="aspect-video w-full object-cover"
              />
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#D7263D] text-xs leading-none text-white"
              >
                ▶
              </span>
              {v.label ? (
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {v.label}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
