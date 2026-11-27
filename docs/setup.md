# সেটআপ গাইড (Setup)

## দরকারি জিনিস

- Node.js 20 বা নতুন (লোকালে Node 24 যাচাই করা)
- npm 10
- Git

## লোকালে চালানো

```bash
git clone https://github.com/diu-shpranto/orderlink-standalone.git
cd orderlink-standalone
npm install --ignore-scripts
cp apps/web/.env.example apps/web/.env
npm run dev
```

তারপর ব্রাউজারে `http://localhost:5173` খুলুন।

> `npm install --ignore-scripts` ব্যবহার করুন — এই পরিবেশে স্ক্রিপ্টসহ ইনস্টলে সমস্যা হতে পারে।

## পরিবেশের ভেরিয়েবল

`apps/web/.env` ফাইলে বসবে (Git-এ যাবে না)। কী কী লাগবে, মান ছাড়া তালিকা: [`env.md`](env.md)।

- **Phase 0:** কোনো চাবি লাগে না — ফাঁকা অ্যাপ চাবি ছাড়াই চলে।
- **Phase 1 থেকে:** Supabase প্রজেক্টের URL ও anon key লাগবে (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)।

## বিল্ড যাচাই

```bash
npm run build
```

সফল হলে `apps/web/dist/` ফোল্ডারে বিল্ড তৈরি হবে।

## ডেপ্লয়

Netlify এই রিপো থেকে অটো-ডেপ্লয় করবে (`netlify.toml` দেখুন)। ডেপ্লয় টার্গেট আগের সাইট **`orderlinkbd`** — https://orderlinkbd.netlify.app। বিস্তারিত: [`deploy-checklist.md`](deploy-checklist.md)।

# docs/setup.md-এ যোগ করার অংশ (Phase 1)

> নিচের অংশটুকু `docs/setup.md`-এর "পরিবেশের ভেরিয়েবল" অংশের পরে যোগ করুন।

## Phase 1 — Supabase যুক্ত করা

প্রজেক্ট তৈরি আছে — **orderlink** (ref `xrkdoijcdokuvsahmepw`,
`https://xrkdoijcdokuvsahmepw.supabase.co`, Singapore, Free plan)।

### 1. লোকাল `.env`

```bash
cp apps/web/.env.example apps/web/.env
```

`apps/web/.env`-এ বসান (মান দেখুন [`env.md`](env.md)):

```env
VITE_SUPABASE_URL=https://xrkdoijcdokuvsahmepw.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase Dashboard → Settings → API → anon public key>
```

### 2. ডাটাবেস মাইগ্রেশন চালানো

Supabase CLI লগইন ও লিংক (একবার):

```bash
supabase login
supabase link --project-ref xrkdoijcdokuvsahmepw
supabase db push
```

CLI না থাকলে Supabase Dashboard → SQL Editor-এ
`supabase/migrations/0001_init.sql`-এর পুরো SQL চালান। এতে sellers,
shops, products, orders, password_resets টেবিল ও RLS নীতি তৈরি হবে।

### 3. Edge Functions ডেপ্লয় (রিসেট কোড)

```bash
supabase secrets set BREVO_API_KEY=... BREVO_SENDER_EMAIL=...
supabase functions deploy send-reset-code --no-verify-jwt
supabase functions deploy verify-reset-code --no-verify-jwt
```

`--no-verify-jwt` লাগবেই — রিসেটের ফাংশন লগইন ছাড়া ডাকা হয়।

### 4. Google লগইন চালু করা

1. GCP প্রজেক্ট **orderlink-516005**-এর OAuth ক্লায়েন্টের Authorized
   redirect URIs-এ যোগ করুন:
   `https://xrkdoijcdokuvsahmepw.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → Providers → Google চালু করে
   ওই ক্লায়েন্টের Client ID ও Secret বসান।
3. Supabase Dashboard → Authentication → Providers → Email-এ
   "Confirm email" বন্ধ রাখুন (লাইভ অ্যাপের মতো)।

### 5. যাচাই (Phase 1-এর গ্রহণের পরীক্ষা)

1. `npm run dev` → `http://localhost:5173` খুলুন → সাইনআপ করুন
   (ইমেইল + পাসওয়ার্ড) → সেটআপ উইজার্ডে দোকানের তথ্য দিন।
2. লগআউট করে আবার লগইন করুন — ড্যাশবোর্ডের খালি কাঠামো দেখাবে।
3. "পাসওয়ার্ড ভুলে গেছেন?" → ইমেইলে ৬ সংখ্যার কোড আসবে → কোড +
   নতুন পাসওয়ার্ড দিয়ে লগইন করুন।
4. Supabase Dashboard → Table Editor-এ দেখুন: sellers/shops সারি
   তৈরি হয়েছে; দ্বিতীয় সেলার প্রথমজনের কোনো ডাটা দেখতে পারে না
   (RLS যাচাই — আলাদা অ্যাকাউন্টে লগইন করে চেক করুন)।

## Phase 2 — প্রোডাক্ট ও পেজ (27 Nov 2026)

- **মাইগ্রেশন চালান:** Supabase Dashboard → SQL Editor-এ
  `supabase/migrations/0002_product_pages.sql`-এর পুরো কনটেন্ট পেস্ট করে
  Run করুন। এতে `product_images` + `pages` টেবিল, `product-images`
  Storage বাকেট (পাবলিক পড়া, মালিকের লেখা) ও RLS পলিসি বসবে।
  0001 আবার চালাতে হবে না।
- নতুন env ভেরিয়েবল লাগে না — একই `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY`।
- গ্রহণের পরীক্ষা: প্রোডাক্ট বানিয়ে প্রকাশ করলে `/<shop>/<product>`
  লিংকটা নতুন ট্যাবে সরাসরি খুলে ঠিক সেই প্রোডাক্টই দেখাবে।

## Phase 3 — অর্ডার (27 Nov 2026)

- **মাইগ্রেশন চালান:** Supabase Dashboard → SQL Editor-এ
  `supabase/migrations/0003_order_events.sql`-এর পুরো কনটেন্ট পেস্ট করে
  Run করুন। এতে অর্ডার কোডের সিকোয়েন্স (OL-1001… — insert-এর আগে
  trigger বসিয়ে দেয়), `order_events` টেবিল (স্ট্যাটাস পরিবর্তনের
  ইতিহাস — trigger নিজে লেখে), orders-এ `internal_notes` কলাম,
  shops-এ `free_delivery_threshold` কলাম বসবে। 0001/0002 আবার
  চালাতে হবে না।
- নতুন env ভেরিয়েবল লাগে না।
- গ্রহণের পরীক্ষা: কাস্টমার পেজে অর্ডার ফর্ম জমা দিন → Supabase
  orders টেবিলে OL-1001… কোডসহ সারি আসবে, আর সেলারের
  /dashboard/orders-এ সঠিক মোটসহ দেখা যাবে। স্ট্যাটাস বদলালে
  order_events-এ ইতিহাস জমবে। Sheet সিঙ্ক Phase 4-এর — অর্ডার দিলে
  এখনো Sheet-এ যাবে না, সেটা কোথাও বলা হয়নি।

## Auth রিডাইরেক্ট বাগের ফিক্স (27 Nov 2026)

- **বাগ:** সাইনআপ/লগইনের পর ফর্ম মাঝে মাঝে ড্যাশবোর্ডে যেত না — বোতাম
  "অপেক্ষা করুন…" দেখিয়ে নীরবে ফর্মে ফিরে আসত, যদিও সেশন তৈরি হয়ে যেত
  (হাতে /dashboard-এ গেলে উইজার্ড/ড্যাশবোর্ড খুলত)।
- **মূল কারণ:** `App.tsx`-এর `AuthRoute` রিডাইরেক্ট করত শুধু `user &&
  seller` দুটোই থাকলে। কিন্তু নতুন সেলারের `sellers` সারি থাকে না —
  সেটা শুধু `SetupWizard` বানায়, আর উইজার্ডে যেতে হয় /dashboard দিয়ে।
  অর্থাৎ উইজার্ড শেষ করার আগের প্রত্যেক সাইনআপ/লগইনেই রিডাইরেক্ট
  আটকে যেত — ডেডলক। (লাইভ টেস্টে "মাঝে মাঝে" মনে হয়েছিল, কারণ
  টেস্টে একবার হাতে /dashboard-এ যাওয়া হয়েছিল।)
- **ফিক্স:** রিডাইরেক্ট এখন শুধু সেশনের ওপর নির্ভর করে — `AuthRoute`
  `user` থাকলেই /dashboard-এ পাঠায়; সাইনআপ/লগইন সফল হলে `Auth.tsx`
  নিজেও সাথে সাথে `navigate('/dashboard')` করে; `loadSeller` ব্যর্থ
  হলে আর throw করে না। /dashboard-এর `SellerGate` আগের মতোই ঠিক করে
  উইজার্ড দেখাবে নাকি ড্যাশবোর্ড।
- নতুন মাইগ্রেশন/নতুন env ভেরিয়েবল লাগে না — শুধু পুশ করলেই Netlify
  অটো-ডেপ্লয় হবে।
- লাইভে আবার যাচাই: নতুন টেস্ট সেলার সাইনআপ করলে সরাসরি উইজার্ডে
  যেতে হবে; আগের টেস্ট অ্যাকাউন্ট (hello.orderlink@yahoo.com) দিয়ে
  লগইন করলে সরাসরি ড্যাশবোর্ডে যেতে হবে।
