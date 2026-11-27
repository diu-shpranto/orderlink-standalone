// Orderlink — Phase 0 scaffold.
// ফাঁকা অ্যাপ: শুধু কাঠামো। হোম পেজ, সেলার প্যানেল, কাস্টমার পেজ ও
// অ্যাডমিন প্যানেল Phase 1–7-এ পরিকল্পনা অনুযায়ী বানানো হবে।
export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <h1 className="text-4xl font-bold">
        <span className="text-brand">Order</span>
        <span className="text-accent">link</span>
      </h1>
      <p className="mt-4 max-w-md text-lg text-gray-600">
        ফেসবুক সেলারদের জন্য ল্যান্ডিং পেজ ও অটো অর্ডার সিস্টেম — আলাদা করে
        বানানো হচ্ছে।
      </p>
      <p className="mt-2 text-sm text-gray-400">
        Phase 0 — ভিত্তি (scaffold)। ফিচার আসছে Phase 1 থেকে।
      </p>
    </main>
  )
}
