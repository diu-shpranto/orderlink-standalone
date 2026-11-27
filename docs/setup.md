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

## Phase 4 — Google Sheet অটো-সিঙ্ক (27 Nov 2026)

- **মাইগ্রেশন চালান:** Supabase Dashboard → SQL Editor-এ
  `supabase/migrations/0004_sheet_sync.sql`-এর পুরো কনটেন্ট পেস্ট করে
  Run করুন। এতে `seller_google_tokens` (এনক্রিপ্ট করা Google টোকেন +
  Sheet লিংক), `sheet_sync_queue` (সিঙ্কের সারি — ব্যর্থ হলে এখান
  থেকেই রিট্রাই), `sheet_sync_events` (সিঙ্কের ইতিহাস) টেবিল বসবে;
  অর্ডার জমলেই trigger কিউতে সারি বসাবে; আর orders-এর
  `sheet_status`-এ 'not_connected' মান যোগ হবে (Google যুক্ত না
  থাকলে অর্ডার এই অবস্থায় থাকে)। 0001–0003 আবার চালাতে হবে না।
- **Secrets বসান** (Supabase Dashboard → Edge Functions → Secrets,
  বা CLI: `supabase secrets set ...`):
  - `SHEET_TOKEN_KEY` — AES-256 চাবি (base64-এ ৩২ বাইট)। মানটা
    প্রজেক্টের রেকর্ডে আছে — কখনো গিটে বা চ্যাটে লিখবেন না।
  - `GOOGLE_CLIENT_ID` — GCP OAuth ক্লায়েন্ট "Orderlink"-এর ID:
    `432178373760-gut73pk7fintfv62gfrb78esfa7rhl1e.apps.googleusercontent.com`
  - `GOOGLE_CLIENT_SECRET` — ওই ক্লায়েন্টের সিক্রেট। পুরনো মান জানা
    নেই, তাই GCP Console → APIs & Services → Credentials → ক্লায়েন্ট
    "Orderlink" → "Add secret" দিয়ে নতুন সিক্রেট বানিয়ে এখানে বসান
    (Phase 1-এ একবার এভাবেই করা হয়েছিল; পুরনো সিক্রেট চালু থাকবে,
    তাই লাইভ Orderlink অ্যাপের Google লগইনে কিছু বদলাবে না)।
  - কেন সিক্রেট লাগে: Supabase Auth provider টোকেন রিফ্রেশ করে না
    (supabase-js issue #707) — Google-এর refresh token থেকে নতুন
    access token বানাতে Google-এর token endpoint-এ client_id +
    client_secret লাগবেই। সিক্রেট না থাকলে সিঙ্ক শুধু সংযোগের সময়ের
    access token (১ ঘণ্টা) দিয়ে চলে, আর সেলার Settings খুললে তাজা
    token ধরা হয় — কিন্তু দীর্ঘমেয়াদে অটো-সিঙ্কের জন্য সিক্রেট
    বসানোই সঠিক পথ।
- **Edge Functions ডেপ্লয় করুন:**
  ```bash
  supabase functions deploy store-google-token
  supabase functions deploy sync-order --no-verify-jwt
  supabase functions deploy sheets-retry --no-verify-jwt
  supabase functions deploy sheets-setup
  supabase functions deploy sheets-disconnect
  ```
  `sync-order` ও `sheets-retry`-এ `--no-verify-jwt` লাগবেই — প্রথমটা
  কাস্টমার লগইন ছাড়া (অর্ডার জমার সময়) ডাকে, দ্বিতীয়টা pg_cron
  থেকে ডাকা হয়। বাকি তিনটায় JWT যাচাই চালু থাকে (শুধু লগইন করা
  সেলার নিজের সংযোগ ছুঁতে পারে)।
- **৩০ মিনিটের অটো-রিট্রাই (pg_cron):** Supabase Dashboard →
  Database → Extensions-এ `pg_cron` ও `pg_net` চালু করুন, তারপর SQL
  Editor-এ চালান (ANON_KEY-এর জায়গায়
  `VITE_SUPABASE_ANON_KEY`-এর মান বসান):
  ```sql
  select cron.schedule(
    'orderlink-sheet-sync-retry',
    '*/30 * * * *',
    $$
    select net.http_post(
      url := 'https://xrkdoijcdokuvsahmepw.supabase.co/functions/v1/sheets-retry',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
    $$
  );
  ```
  কাজ করছে কি না দেখতে: `select * from cron.job;` আর
  `select * from cron.job_run_details order by start_time desc limit 5;`
- **যেভাবে কাজ করে:** সেলার Settings → Google Sheets থেকে Google
  যুক্ত করে (scopes: drive.file + spreadsheets; access_type=offline,
  prompt=consent — refresh token পেতে), তারপর নতুন Sheet বানায় বা
  আগের Sheet-এর লিংক যাচাই করে যুক্ত করে। অর্ডার জমলেই sync-order
  ফায়ার-অ্যান্ড-ফরগেট ডাকা হয় — সেদিনের (Asia/Dhaka তারিখ) ট্যাবে
  Order ID দিয়ে ডুপ্লিকেট আটকে সারি যোগ হয়। ব্যর্থ হলে কিউতে failed
  হয়ে ৩০ মিনিট পর আবার চেষ্টা হয় (সর্বোচ্চ ১০ বার); Settings-এর
  "ব্যর্থ সিঙ্ক আবার চেষ্টা করুন" বোতামে এখনই চেষ্টা হয়। Google যুক্ত
  না করা সেলারের অর্ডার Sheet-এ যায় না — UI-তে সত্য কথাই লেখা থাকে।
- **গ্রহণের পরীক্ষা:** টেস্ট সেলার দিয়ে Google যুক্ত করে নতুন Sheet
  বানান → কাস্টমার পেজে টেস্ট অর্ডার দিন → সেই Sheet-এর আজকের
  ট্যাবে (যেমন 2026-11-27) সারিটা নিজে থেকে আসবে, মোট সঠিক থাকবে।
  ইচ্ছে করে ব্যর্থ করালে (যেমন Sheet মুছে) রিট্রাইয়ে ঠিক হয়,
  ডুপ্লিকেট সারি হয় না। দ্বিতীয় সেলারের Sheet-এ প্রথমজনের অর্ডার
  যাবে না (RLS + প্রতি সেলারের নিজের টোকেন)।
