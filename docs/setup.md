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

## Phase 5 — সাবস্ক্রিপশন + হাতে পেমেন্ট (মনিটাইজেশন)

একটাই মাসিক সাবস্ক্রিপশন, ঠিক ৪টি প্যাকেজ (Starter ৳৯৯/৩ পেজ/১০০ MB,
Basic ৳১৯৯/৫/২৫০ MB, Growth ৳৩৯৯/১০/৫০০ MB, Business ৳৬৯৯/২০/১ GB)।
এক পেমেন্ট = অনুমোদনের দিন থেকে ৩০ দিন; মেয়াদ শেষে ৩ দিনের গ্রেস,
তারপর ফ্রি সার্ভিস (শুধু ১টি পেজ চালু, বাকি সাসপেন্ডেড — কখনো মোছা
হয় না)। নতুন অ্যাকাউন্ট ফ্রি প্ল্যানে শুরু করে (সর্বোচ্চ ১টি সক্রিয়
পেজ)। পেমেন্ট শুধু হাতে — bKash/Nagad/Upay + TrxID + অ্যাডমিন অনুমোদন;
অনুমোদনের আগে কিছুই চালু হয় না।

- **মাইগ্রেশন চালান:** Supabase Dashboard → SQL Editor-এ
  `supabase/migrations/0005_subscription.sql`-এর পুরো কনটেন্ট চালান।
  প্রত্যাশা: "Success. No rows returned"। যাচাই:
  ```sql
  select id, price_bdt, max_pages, storage_mb from public.subscription_plans order by sort_order;
  select key, value from public.platform_settings;
  ```
  প্রত্যাশা: ৪টি প্ল্যান (99/199/399/699); payment নম্বরগুলো খালি
  (`''`), grace_days `3`।
- **পেমেন্টের নম্বর বসান (আগে এটা না করলে কেনার পথ বন্ধ থাকবে):**
  ```sql
  update public.platform_settings set value = '<bKash নম্বর>' where key = 'payment_bkash_number';
  update public.platform_settings set value = '<Nagad নম্বর>' where key = 'payment_nagad_number';
  update public.platform_settings set value = '<Upay নম্বর>' where key = 'payment_upay_number';
  ```
  নম্বরগুলো শুধু এখানেই থাকে — রেপোতে (পাবলিক) কখনো লেখা যাবে না।
- **Edge Functions ডেপ্লয় করুন:**
  ```bash
  supabase functions deploy submit-subscription-payment
  supabase functions deploy review-subscription-payment --no-verify-jwt
  supabase functions deploy process-subscription-expiry --no-verify-jwt
  ```
  `submit-subscription-payment`-এ JWT যাচাই চালু (শুধু লগইন করা
  সেলার নিজের পেমেন্ট জমা দিতে পারে)। `review-subscription-payment`
  শুধু service-role key দিয়ে ডাকা যায় (Phase 6 অ্যাডমিন প্যানেলের
  জন্য)। `process-subscription-expiry` pg_cron থেকে ডাকা হয়।
- **প্রতিদিনের মেয়াদ-প্রসেসর (pg_cron):** Database → Extensions-এ
  `pg_cron` ও `pg_net` চালু আছে কি না দেখুন (Phase 4-এ চালু করা
  হয়েছে), তারপর SQL Editor-এ চালান (ANON_KEY-এর জায়গায়
  `VITE_SUPABASE_ANON_KEY`-এর মান বসান):
  ```sql
  select cron.schedule(
    'orderlink-subscription-expiry',
    '0 0 * * *',
    $$
    select net.http_post(
      url := 'https://xrkdoijcdokuvsahmepw.supabase.co/functions/v1/process-subscription-expiry',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
    $$
  );
  ```
  প্রতিদিন রাত ১২টায় (UTC) চলে — মেয়াদ শেষ হলে গ্রেস শুরু, গ্রেস
  শেষ হলে ফ্রি সার্ভিস। কাজ করছে কি না দেখতে:
  `select * from cron.job;` আর
  `select * from cron.job_run_details order by start_time desc limit 5;`
  হাতে চালিয়ে দেখতে চাইলে: `select public.process_subscription_expiry();`
- **ডেমো শপে Starter দিন (লাইভ অ্যাপের ডেমো শপের মতো):**
  ```sql
  insert into public.seller_subscriptions (seller_id, plan_id, starts_at, ends_at, status)
  select id, 'starter', now(), now() + interval '30 days', 'active'
  from public.sellers where email = 'demo@orderlink.demo'
  on conflict (seller_id) do update set
    plan_id = 'starter', starts_at = now(),
    ends_at = now() + interval '30 days', status = 'active';
  insert into public.subscription_history (seller_id, plan_id, action, note)
  select id, 'starter', 'plan_assigned', 'ডেমো শপে Starter দেওয়া হয়েছে।'
  from public.sellers where email = 'demo@orderlink.demo';
  ```
- **গ্রহণের পরীক্ষা:** TEST Shop দিয়ে Settings → সাবস্ক্রিপশন খুলুন —
  "ফ্রি প্ল্যান" দেখাবে। প্যাকেজ বাছুন → পেমেন্টের নম্বর দেখা যাবে →
  ভুল TrxID দিয়ে জমা দিলে পেমেন্ট pending হবে; একই TrxID আবার দিলে
  আটকাবে। SQL Editor-এ
  `select public.approve_subscription_payment('<payment id>');`
  চালালে রসিদ (OL-RCP-1001…) ফিরবে আর ড্যাশবোর্ডে প্যাকেজের নাম
  দেখাবে। ফ্রি প্ল্যানে ২য় পেজ প্রকাশ করলে সীমার ভুল দেখাবে।
  `select public.reject_subscription_payment('<payment id>', 'কারণ');`
  চালালে বাতিলের কারণ সেলারকে হুবহু দেখাবে।

## বিল্ডার ৭ ধাপ + নতুন ফিল্ড (28 Nov 2026)

লাইভ অ্যাপের বিল্ডারের মতো করে বিল্ডারটা ৭ ধাপে সাজানো হয়েছে
(টেমপ্লেট → পণ্যের তথ্য → ছবি → ভিডিও → কাস্টমার রিভিউ → জিজ্ঞাসা →
প্রিভিউ ও পাবলিশ) — একটাই "সেভ করুন" বোতাম (ধাপ ৭-এ), পাবলিশ চেকবক্স
দিয়ে খসড়া/প্রকাশ ঠিক হয়। নতুন ৩টি ঐচ্ছিক ফিল্ড: ছোট বিবরণ
(`products.short_description` — নামের নিচে এক লাইনে), ক্যাটাগরি
(`products.category` — পেজে ছোট লেবেল), ডেলিভারি তথ্য
(`pages.delivery_info` — অর্ডার সেকশনে দেখায়)।

- **মাইগ্রেশন চালান:** Supabase Dashboard → SQL Editor-এ
  `supabase/migrations/0006_builder_fields.sql`-এর পুরো কনটেন্ট চালান।
  প্রত্যাশা: "Success. No rows returned"। যাচাই:
  ```sql
  select column_name from information_schema.columns
  where table_name in ('products', 'pages')
  and column_name in ('short_description', 'category', 'delivery_info');
  ```
  প্রত্যাশা: ৩টি সারি। মাইগ্রেশন না চলা পর্যন্ত বিল্ডার নতুন ফিল্ড
  ছাড়াই সেভ করবে (কোডে ফলব্যাক আছে) — সেভ ভাঙবে না, শুধু নতুন
  ৩টি ফিল্ড সেভ হবে না আর নোটিশে জানাবে।

## লগইন ছাড়া অর্ডার + পাবলিক WhatsApp ঠিক করা (28 Nov 2026)

দুটো পুরনো বাগ: (১) লগইন ছাড়া কাস্টমার অর্ডার দিলে "অর্ডার দেওয়া
যায়নি" দেখাত — অথচ অর্ডার তৈরি হয়েই যেত (insert-এর read-back
RLS-এ আটকাত); (২) পাবলিক পেজে সেলারের WhatsApp বোতাম কখনো
দেখাত না (sellers টেবিল পড়া RLS-এ আটকাত)। ঠিক করা হয়েছে
`orders.client_key` কলাম + দুটো SECURITY DEFINER ফাংশন দিয়ে
(`get_order_code_by_client_key` — শুধু ওই কী-র অর্ডারের id + কোড,
১০ মিনিটের ভেতরেরটা; `get_seller_whatsapp` — শুধু নম্বরটাই)।
RLS পলিসিতে কোনো বদল নেই।

- **মাইগ্রেশন চালান:** Supabase Dashboard → SQL Editor-এ
  `supabase/migrations/0007_public_order_whatsapp.sql`-এর পুরো কনটেন্ট চালান।
  প্রত্যাশা: "Success. No rows returned"। যাচাই:
  ```sql
  select column_name from information_schema.columns
  where table_name = 'orders' and column_name = 'client_key';
  select proname from pg_proc
  where proname in ('get_order_code_by_client_key', 'get_seller_whatsapp');
  select public.get_seller_whatsapp('demo-shop');
  select * from public.get_order_code_by_client_key('no-such-key');
  ```
  প্রত্যাশা: ১ম কুয়েরিতে ১টি সারি (client_key), ২য়টায় ২টি সারি
  (দুটো ফাংশন), ৩য়টায় ডেমো সেলারের নম্বর 8801712345678, ৪র্থটায়
  ০টি সারি। মাইগ্রেশন না চলা পর্যন্তও অর্ডার চলবে (কোডে ফলব্যাক
  আছে — কী ছাড়া জমা দিয়ে ফোন দিয়ে কোড আনা হয়), শুধু পাবলিক
  পেজে WhatsApp বোতাম দেখাবে না।

## একাধিক ভিডিও + বিবরণ/ডেলিভারি সেকশন (28 Nov 2026)

বিল্ডারে এখন একাধিক ভিডিও (ডেমো/টিউটোরিয়াল লেবেলসহ), রিভিউতে
কাস্টমারের ছবি + স্ক্রিনশট, বিবরণ ও ডেলিভারি তথ্য আলাদা
টগল/ক্রমযোগ্য সেকশন, ছবি ও সেকশন টেনে সাজানো (ড্র্যাগ-ড্রপ),
ছবি বদলানো, আর ভিডিও লিংকের যাচাই। রিভিউর ছবি/স্ক্রিনশট
`pages.reviews` (JSONB)-এই থাকে — মাইগ্রেশন লাগে না। ভিডিওর
তালিকার জন্য নতুন কলাম লাগে:

- **মাইগ্রেশন চালান:** Supabase Dashboard → SQL Editor-এ
  `supabase/migrations/0008_builder_videos.sql`-এর পুরো কনটেন্ট চালান।
  প্রত্যাশা: "Success. No rows returned"। যাচাই:
  ```sql
  select column_name from information_schema.columns
  where table_name = 'pages' and column_name = 'video_urls';
  ```
  প্রত্যাশা: ১টি সারি। মাইগ্রেশন না চলা পর্যন্তও বিল্ডার চলবে
  (কোডে ফলব্যাক আছে — ভিডিওর তালিকা বাদ দিয়ে সেভ হবে আর
  নোটিশে জানাবে; পুরনো এক ভিডিওর লিংক আগের মতোই কাজ করবে)।

## অর্ডারের বিশেষ নোট (28 Nov 2026)

অর্ডার ফর্মে এখন ঐচ্ছিক ৪ নম্বর সেকশন "বিশেষ নোট" — কাস্টমার চাইলে
অর্ডার সম্পর্কে কিছু লিখতে পারে (খালি রাখলেও অর্ডার জমা হয়)। নোট
সেলারের অর্ডার ডিটেইলে দেখায়, আর Sheet সিঙ্কে শেষ কলাম হিসেবে
যায়। নতুন কলামের জন্য মাইগ্রেশন লাগে:

- **মাইগ্রেশন চালান:** Supabase Dashboard → SQL Editor-এ
  `supabase/migrations/0009_customer_note.sql`-এর পুরো কনটেন্ট চালান।
  প্রত্যাশা: "Success. No rows returned"। যাচাই:
  ```sql
  select column_name from information_schema.columns
  where table_name = 'orders' and column_name = 'customer_note';
  ```
  প্রত্যাশা: ১টি সারি। মাইগ্রেশন না চললেও অর্ডার চলবে
  (কোডে ফলব্যাক আছে — নোট ছাড়া জমা হবে; নোটটা তখন সেভ
  হবে না, তাই মাইগ্রেশন আগে চালানোই ভালো)।
  Sheet সিঙ্কে নতুন শেষ কলাম "Special Note" (L) — পুরনো ১১টি
  কলামের ক্রম একই আছে; Edge Function কোড বদলালেও ডেপ্লয়
  আলাদা ধাপ (`supabase functions deploy sync-order` ও
  `supabase functions deploy sheets-setup`)।
