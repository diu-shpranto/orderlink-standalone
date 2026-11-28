// তথ্য পেজ — About, Contact, Privacy, Terms, Help।
// সব আসল বাংলা লেখা; কোথাও "শীঘ্রই আসছে" নেই।
// যোগাযোগ: xolvekart@gmail.com (mailto)। ফোন/WhatsApp নম্বর নেই।
import { navigate } from '../lib/router.ts'
import { LogoWordmark } from '../components/Logo.tsx'

function PageShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button type="button" onClick={() => navigate('/')} aria-label="Orderlink হোম">
            <LogoWordmark />
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-brand-dark"
          >
            ← হোমে ফিরুন
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-700 md:text-base">
          {children}
        </div>
      </main>
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © ২০২৬ Orderlink — সর্বস্বত্ব সংরক্ষিত।
      </footer>
    </div>
  )
}

export function AboutPage() {
  return (
    <PageShell title="আমাদের সম্পর্কে">
      <p>
        Orderlink বাংলাদেশের ফেসবুক ও সোশ্যাল কমার্স সেলারদের জন্য তৈরি — কোডিং
        ছাড়া পণ্যের ল্যান্ডিং পেজ বানানোর আর প্রতিটা অর্ডার নিজের Google
        Sheet-এ অটোমেটিক পাওয়ার এক সহজ ব্যবস্থা।
      </p>
      <p>
        আমরা বিশ্বাস করি, ছোট সেলারদেরও বড় দোকানের মতো সুন্দর পেজ আর
        গোছানো অর্ডারের হিসাব থাকা উচিত — মেসেঞ্জারের ভিড়ে অর্ডার হারানো
        ছাড়াই।
      </p>
      <p>
        Orderlink XolveKart-এর একটি পণ্য — "Ideas to Innovation"।
      </p>
    </PageShell>
  )
}

export function ContactPage() {
  return (
    <PageShell title="যোগাযোগ">
      <p>
        যেকোনো প্রশ্ন, সমস্যা বা পরামর্শের জন্য আমাদের ইমেইল করুন — আমরা
        যত দ্রুত সম্ভব উত্তর দেব।
      </p>
      <p>
        <a
          href="mailto:xolvekart@gmail.com"
          className="inline-block rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-brand-dark"
        >
          ✉ xolvekart@gmail.com
        </a>
      </p>
      <p>
        ইমেইলে আপনার দোকানের নাম ও সমস্যাটা সংক্ষেপে লিখলে উত্তর দিতে
        সুবিধা হয়।
      </p>
    </PageShell>
  )
}

export function PrivacyPage() {
  return (
    <PageShell title="গোপনীয়তা নীতি">
      <p>
        Orderlink আপনার ব্যক্তিগত তথ্য সংগ্রহ করে শুধু সেবা চালানোর জন্য —
        অ্যাকাউন্ট খোলা, লগইন, অর্ডার নেওয়া ও সাবস্ক্রিপশন পরিচালনা।
      </p>
      <p>
        কাস্টমারের নাম, ফোন ও ঠিকানা শুধু সেই সেলারই দেখতে পারেন, যার দোকানে
        অর্ডার এসেছে। অ্যাডমিনসহ আর কেউ কাস্টমারের ব্যক্তিগত তথ্য দেখতে
        পারে না — এটাই আমাদের Zero Customer Data নীতি।
      </p>
      <p>
        আপনার Google Sheet-এর সংযোগের টোকেন সার্ভারে এনক্রিপ্ট করে রাখা হয়;
        তা কখনো ব্রাউজারের কোডে বা অন্য সেলারের কাছে যায় না।
      </p>
      <p>
        আপনার তথ্য মুছতে চাইলে Settings থেকে অ্যাকাউন্ট মুছে ফেলার অনুরোধ
        করতে পারেন।
      </p>
    </PageShell>
  )
}

export function TermsPage() {
  return (
    <PageShell title="শর্তাবলী">
      <p>
        Orderlink ব্যবহার করে আপনি এই শর্তগুলো মেনে নিচ্ছেন: আপনি নিজের
        দোকানের পণ্য ও দামের তথ্যের জন্য দায়ী; ভুল বা বিভ্রান্তিকর তথ্য
        দিলে আপনার পেজ বন্ধ করা হতে পারে।
      </p>
      <p>
        সাবস্ক্রিপশন মাসিক — এক পেমেন্টে অনুমোদনের দিন থেকে ৩০ দিনের
        অ্যাক্সেস। পেমেন্ট ম্যানুয়াল (bKash/Nagad/Upay + TrxID); অ্যাডমিন
        অনুমোদনের পরেই প্যাকেজ চালু হয়।
      </p>
      <p>
        মেয়াদ শেষে ৩ দিনের গ্রেস থাকে; তারপর ফ্রি সার্ভিসে শুধু ১টি পেজ
        লাইভ থাকবে, বাকিগুলো সাসপেন্ড হবে (মুছে যাবে না)। নবায়নে সব ফিরে
        আসবে।
      </p>
      <p>
        আমরা যেকোনো সময় শর্ত বদলাতে পারি — বড় বদল হলে সেলারদের জানানো হবে।
      </p>
    </PageShell>
  )
}

export function HelpPage() {
  return (
    <PageShell title="সাহায্য কেন্দ্র">
      <p>
        <strong>পেজ বানাব কীভাবে?</strong> — লগইন করে ড্যাশবোর্ড → প্রোডাক্ট
        → "নতুন প্রোডাক্ট" — ছবি, দাম, বিবরণ দিন, টেমপ্লেট বেছে নিন, প্রকাশ
        করুন। লিংকটা ফেসবুক পোস্টে দিন।
      </p>
      <p>
        <strong>অর্ডার কোথায় দেখব?</strong> — ড্যাশবোর্ডের অর্ডার তালিকায়;
        একই অর্ডার আপনার Google Sheet-এর আজকের ট্যাবেও জমা হবে।
      </p>
      <p>
        <strong>পাসওয়ার্ড ভুলে গেছি?</strong> — লগইন পেজে "পাসওয়ার্ড ভুলে
        গেছেন?" চাপুন — ইমেইলে ৬ সংখ্যার কোড আসবে, সেটা দিয়ে নতুন
        পাসওয়ার্ড বসান।
      </p>
      <p>
        <strong>আরো সাহায্য লাগলে</strong> — xolvekart@gmail.com-এ ইমেইল
        করুন।
      </p>
    </PageShell>
  )
}
