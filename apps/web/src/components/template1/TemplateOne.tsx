// "টেমপ্লেট ১ — ইয়ারবাডস" — একটাই product অবজেক্ট + seller
// থেকে পুরো ল্যান্ডিং পেজ। রেফারেন্স ডিজাইনের মতো: হেডার,
// দুই কলামের হিরো (গ্যালারি + তথ্য), বিবরণ, স্পেসিফিকেশন,
// ভিডিও, কাস্টমার রিভিউ, সবুজ অর্ডার ব্লক (বাঁয়ে সারাংশ,
// ডানে ফর্ম), ফুটার, মোবাইল স্টিকি বার, লাইটবক্স। পরিমাণ ও
// ডেলিভারি এলাকার স্টেট এখানে থাকে, যাতে সারাংশের হিসাব
// লাইভ বদলায়। ভিডিও/রিভিউ/বিবরণ না থাকলে সেই সেকশন আসে না।
import { useCallback, useState } from 'react'
import TemplateOneGallery from './Gallery.tsx'
import TemplateOneHeader from './Header.tsx'
import { bdt, effectiveDeliveryCharge } from './helpers.ts'
import TemplateOneLightbox from './Lightbox.tsx'
import TemplateOneOrderForm from './OrderForm.tsx'
import TemplateOneProductInfo from './ProductInfo.tsx'
import TemplateOneReviews from './Reviews.tsx'
import TemplateOneSpecs from './Specs.tsx'
import TemplateOneStickyBar from './StickyBar.tsx'
import TemplateOneVideoSection from './VideoSection.tsx'
import type {
  DeliveryArea,
  TemplateOneProduct,
  TemplateOneSeller,
} from './types.ts'

export default function TemplateOne({
  seller,
  product,
}: {
  seller: TemplateOneSeller
  product: TemplateOneProduct
}) {
  const images = product.images.slice(0, 8)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [area, setArea] = useState<DeliveryArea>('inside')
  const [activeVideo, setActiveVideo] = useState(0)
  const [autoplayVideo, setAutoplayVideo] = useState(false)

  const productTotal = product.price * quantity
  // দেখানো ডেলিভারি চার্জ আর placeOrder-এ জমা হওয়া চার্জ একই
  // নিয়মে (ফ্রি-ডেলিভারি সীমাসহ) হিসাব হয় — দুটো আলাদা হয় না।
  const deliveryCharge = effectiveDeliveryCharge(
    product.deliveryCharges.inside,
    product.deliveryCharges.outside,
    product.freeDeliveryThreshold,
    productTotal,
    area,
  )
  const total = productTotal + deliveryCharge

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])
  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const navigateLightbox = useCallback(
    (direction: 1 | -1) => {
      setLightboxIndex((current) =>
        current === null
          ? current
          : (current + direction + images.length) % images.length,
      )
    },
    [images.length],
  )

  const selectVideo = useCallback((index: number) => {
    setActiveVideo(index)
    setAutoplayVideo(true)
  }, [])
  const selectVideoFromGallery = useCallback((index: number) => {
    selectVideo(index)
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    document
      .getElementById('video')
      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }, [selectVideo])

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[17px] leading-[1.6] text-[#14211A] max-[860px]:text-base">
      <TemplateOneHeader seller={seller} />
      <main className="mx-auto max-w-[1160px] px-4 min-[861px]:px-5">
        <div className="grid grid-cols-1 items-start gap-[22px] py-5 min-[861px]:grid-cols-[1.05fr_1fr] min-[861px]:gap-14 min-[861px]:py-11">
          <TemplateOneGallery
            images={images}
            productName={product.name}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
            onOpen={openLightbox}
            videos={product.videos ?? []}
            onSelectVideo={selectVideoFromGallery}
          />
          <TemplateOneProductInfo product={product} />
        </div>

        {product.shortDescription ? (
          <section className="py-6">
            <h2 className="mb-3 text-2xl font-bold min-[861px]:text-[28px]">
              পণ্যের বিবরণ
            </h2>
            <p className="m-0 max-w-[720px] leading-relaxed">
              {product.shortDescription}
            </p>
          </section>
        ) : null}

        <TemplateOneSpecs specs={product.specs} />

        <TemplateOneVideoSection
          videos={product.videos ?? []}
          productName={product.name}
          activeIndex={activeVideo}
          onSelect={selectVideo}
          autoplay={autoplayVideo}
        />

        <TemplateOneReviews
          reviews={product.reviews ?? []}
          rating={product.rating}
          reviewCount={product.reviewCount}
        />

        <section
          id="order"
          className="mb-10 grid scroll-mt-6 grid-cols-1 gap-[22px] rounded-[22px] bg-[#0B5D3B] p-4 text-white min-[861px]:grid-cols-[1fr_1.1fr] min-[861px]:gap-11 min-[861px]:rounded-[28px] min-[861px]:p-10"
        >
          <div>
            <h2 className="mb-2 text-2xl font-bold text-white min-[861px]:text-[28px]">
              অর্ডার করতে ফর্মটি পূরণ করুন
            </h2>
            <p className="mb-[18px] text-[#CFE6D9]">
              আমাদের প্রতিনিধি ফোন করে অর্ডার কনফার্ম করবেন। পণ্য হাতে
              পেয়ে টাকা দিন।
            </p>
            <div className="rounded-2xl bg-white/10 px-5 py-[18px]">
              <div className="flex justify-between gap-3 py-1">
                <span>{product.name}</span>
                <span className="shrink-0">{bdt(productTotal)}</span>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <span>ডেলিভারি চার্জ</span>
                <span className="shrink-0">
                  {deliveryCharge > 0 ? bdt(deliveryCharge) : 'ফ্রি ডেলিভারি'}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-3 border-t border-dashed border-white/40 pt-2.5 text-[22px] font-bold">
                <span>সর্বমোট</span>
                <span className="shrink-0">{bdt(total)}</span>
              </div>
            </div>
          </div>
          <TemplateOneOrderForm
            product={product}
            quantity={quantity}
            area={area}
            onQuantityChange={setQuantity}
            onAreaChange={setArea}
          />
        </section>
      </main>

      <footer className="pb-[90px] pt-1.5 text-center text-sm text-[#5B6B62] min-[861px]:pb-[30px]">
        © {seller.name}। সর্বস্বত্ব সংরক্ষিত।
      </footer>

      <TemplateOneStickyBar price={product.price} />

      {lightboxIndex !== null && images.length > 0 ? (
        <TemplateOneLightbox
          images={images}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
        />
      ) : null}
    </div>
  )
}
