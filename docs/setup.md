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
