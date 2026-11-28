// "টেমপ্লেট ২ — ফ্যাশন ও লাইফস্টাইল" — একটাই product অবজেক্ট
// + seller থেকে পুরো ল্যান্ডিং পেজ। এডিটোরিয়াল স্প্লিট হিরো
// (বাঁয়ে গ্যালারি, ডানে তথ্য), হাইলাইট, গল্প, স্পেসিফিকেশন,
// সাইজ গাইড, লাইফস্টাইল ব্যান্ড, ফিচার, রিভিউ, বিশেষ অফার,
// অর্ডার সেকশন (বাঁয়ে সারাংশ, ডানে ফর্ম), ডেলিভারি তথ্য,
// FAQ, সেলার ফুটার, মোবাইল স্টিকি বার, লাইটবক্স।
// সাইজ/রং/পরিমাণ/এলাকার স্টেট এখানে থাকে, যাতে সারাংশের
// হিসাব লাইভ বদলায়। হিরোর গ্যালারিই গ্যালারি সেকশনের কাজ
// করে (আলাদা করে একই ছবি দুবার দেখানো হয় না)।
// ডাটা না থাকলে সেই সেকশন আসে না (রিভিউর খালি অবস্থা ছাড়া)।
import { useCallback, useState } from 'react'
import TemplateTwoDeliveryInfo from './DeliveryInfo.tsx'
import TemplateTwoFaq from './Faq.tsx'
import TemplateTwoFeatures from './Features.tsx'
import TemplateTwoFooter from './Footer.tsx'
import TemplateTwoGallery from './Gallery.tsx'
import TemplateTwoHeader from './Header.tsx'
import { bdt, effectiveDeliveryCharge } from './helpers.ts'
import TemplateTwoHighlights from './Highlights.tsx'
import TemplateTwoLightbox from './Lightbox.tsx'
import TemplateTwoLifestyle from './Lifestyle.tsx'
import TemplateTwoOrderForm from './OrderForm.tsx'
import TemplateTwoProductInfo from './ProductInfo.tsx'
import TemplateTwoReviews from './Reviews.tsx'
import TemplateTwoSizeGuide from './SizeGuide.tsx'
import TemplateTwoSpecialOffer from './SpecialOffer.tsx'
import TemplateTwoSpecs from './Specs.tsx'
import TemplateTwoStickyBar from './StickyBar.tsx'
import TemplateTwoStory from './Story.tsx'
import type {
  DeliveryArea,
  TemplateTwoProduct,
  TemplateTwoSeller,
} from './types.ts'

export default function TemplateTwo({
  seller,
  product,
}: {
  seller: TemplateTwoSeller
  product: TemplateTwoProduct
}) {
  const images = product.images.slice(0, 6)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [area, setArea] = useState<DeliveryArea>('inside')

  const productTotal = product.price * quantity
  // দেখানো ডেলিভারি চার্জ আর (Stage 2-এ) placeOrder-এ জমা হওয়া
  // চার্জ একই নিয়মে (ফ্রি-ডেলিভারি সীমাসহ) হিসাব হয়।
  const deliveryCharge = effectiveDeliveryCharge(
    product.deliveryCharges.inside,
    product.deliveryCharges.outside,
    product.freeDeliveryThreshold,
    productTotal,
    area,
  )
  const total = productTotal + deliveryCharge
  const selectedColor = product.colors.find((c) => c.name === color)

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

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[17px] leading-[1.6] text-[#181818]">
      <TemplateTwoHeader seller={seller} />
      <main>
        <div className="mx-auto max-w-[1240px] px-4 lg:px-6">
          <section
            id="hero"
            className="grid scroll-mt-6 grid-cols-1 items-start gap-8 py-6 lg:grid-cols-2 lg:gap-14 lg:py-12"
          >
            <TemplateTwoGallery
              images={images}
              productName={product.name}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
              onOpen={openLightbox}
            />
            <TemplateTwoProductInfo
              product={product}
              size={size}
              color={color}
              quantity={quantity}
              onSizeChange={setSize}
              onColorChange={setColor}
              onQuantityChange={setQuantity}
            />
          </section>

          <TemplateTwoHighlights highlights={product.highlights} />
          <TemplateTwoStory story={product.story} />
          <TemplateTwoSpecs specs={product.specs} />
          <TemplateTwoSizeGuide
            rows={product.sizeGuide}
            note={product.sizeGuideNote}
          />
        </div>

        <TemplateTwoLifestyle items={product.lifestyle} />

        <div className="mx-auto max-w-[1240px] px-4 lg:px-6">
          <TemplateTwoFeatures
            features={product.features}
            image={images[3] ?? images[0]}
          />
          <TemplateTwoReviews
            reviews={product.reviews}
            rating={product.rating}
            reviewCount={product.reviewCount}
          />
          <TemplateTwoSpecialOffer product={product} />

          <section id="order" className="scroll-mt-6 py-10 lg:py-14">
            <p className="m-0 mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#294C3C]">
              অর্ডার করুন
            </p>
            <h2 className="m-0 mb-2 font-serif text-[28px] font-bold leading-tight text-[#181818] lg:text-4xl">
              আপনার পছন্দের পণ্যটি অর্ডার করুন
            </h2>
            <p className="m-0 mb-8 leading-relaxed text-[#77736F]">
              সঠিক তথ্য দিয়ে নিচের ফর্মটি পূরণ করুন।
            </p>
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-10">
              <div className="rounded-[4px] border border-[#EAE7E1] bg-white p-6 lg:sticky lg:top-6 lg:p-7">
                <h3 className="m-0 mb-5 font-serif text-xl font-bold text-[#181818]">
                  অর্ডারের সারাংশ
                </h3>
                <div className="grid gap-2.5 text-[15px]">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#77736F]">পণ্য</span>
                    <span className="text-right font-semibold">
                      {product.name}
                    </span>
                  </div>
                  {size ? (
                    <div className="flex justify-between gap-3">
                      <span className="text-[#77736F]">সাইজ</span>
                      <span className="font-semibold">{size}</span>
                    </div>
                  ) : null}
                  {selectedColor ? (
                    <div className="flex justify-between gap-3">
                      <span className="text-[#77736F]">রং</span>
                      <span className="font-semibold">
                        {selectedColor.name}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3">
                    <span className="text-[#77736F]">পরিমাণ</span>
                    <span className="font-semibold">× {quantity}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#77736F]">একক মূল্য</span>
                    <span className="font-semibold">{bdt(product.price)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#77736F]">উপমোট</span>
                    <span className="font-semibold">{bdt(productTotal)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#77736F]">ডেলিভারি চার্জ</span>
                    <span className="font-semibold">
                      {deliveryCharge > 0
                        ? bdt(deliveryCharge)
                        : 'ফ্রি ডেলিভারি'}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between gap-3 border-t border-dashed border-[#EAE7E1] pt-3 font-serif text-[22px] font-bold">
                    <span>সর্বমোট</span>
                    <span>{bdt(total)}</span>
                  </div>
                </div>
                <p className="m-0 mt-5 rounded-[4px] bg-[#E9EEE9] px-4 py-3 text-sm leading-relaxed text-[#294C3C]">
                  ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দেবেন। অগ্রিম
                  কোনো টাকা লাগবে না।
                </p>
              </div>
              <TemplateTwoOrderForm
                product={product}
                size={size}
                color={color}
                quantity={quantity}
                area={area}
                onSizeChange={setSize}
                onColorChange={setColor}
                onQuantityChange={setQuantity}
                onAreaChange={setArea}
              />
            </div>
          </section>

          <TemplateTwoDeliveryInfo product={product} />
          <TemplateTwoFaq faqs={product.faqs} />
          <div aria-hidden="true" className="h-[84px] lg:hidden" />
        </div>
      </main>

      <TemplateTwoFooter seller={seller} />
      <TemplateTwoStickyBar price={product.price} />

      {lightboxIndex !== null && images.length > 0 ? (
        <TemplateTwoLightbox
          images={images}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
        />
      ) : null}
    </div>
  )
}
