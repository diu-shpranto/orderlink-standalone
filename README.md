# Orderlink — আলাদা করে বানানো (Standalone Rebuild)

> ফেসবুক সেলারদের জন্য ল্যান্ডিং পেজ ও অটো অর্ডার সিস্টেম — নিজের GitHub রিপো, নিজের Supabase, নিজের ডোমেইন।

**Orderlink** দিয়ে সেলাররা কোডিং ছাড়া প্রোডাক্টের ল্যান্ডিং পেজ বানান, আর প্রতিটা অর্ডার অটোমেটিক তাদের নিজের Google Sheet-এ জমা হয়। এই রিপোটি সেই অ্যাপের **আলাদা সংস্করণ** — Muse-এর ভেতরে চলা মূল সংস্করণের বদলে, নিজের মালিকানায় আবার বানানো হচ্ছে।

> **অবস্থা: Phase 0 — ভিত্তি (scaffold)।** ফাঁকা অ্যাপের কাঠামো তৈরি। Phase 1 থেকে ফিচার বানানো হবে।

## মূল নীতি (পরিকল্পনা থেকে)

- **Keep It Simple** — পরিকল্পনার বাইরে কোনো ফিচার নয়।
- **অটো-সিঙ্ক বাধ্যতামূলক** — অর্ডার প্রথমে ডাটাবেসে, তারপর সেলারের Sheet-এ (প্রতিদিন আলাদা ট্যাব)।
- **একটাই মাসিক সাবস্ক্রিপশন** — Starter ৳৯৯, Basic ৳১৯৯, Growth ৳৩৯৯, Business ৳৬৯৯। কোনো পেজ ক্রেডিট নেই, আলাদা হোস্টিং ফি নেই, অর্ডারপ্রতি চার্জ নেই, কমিশন নেই।
- **Zero Customer Data** — অ্যাডমিন কাস্টমারের নাম, ফোন, ঠিকানা বা অর্ডারের বিবরণ দেখতে পারবে না।
- **সিক্রেট কখনো কোডে নয়** — API key, OAuth secret, service-role key শুধু `.env` (লোকালে) আর Netlify/Supabase-এর সিক্রেট সেটিংসে থাকবে।

## স্ট্যাক

| অংশ | প্রযুক্তি |
|---|---|
| ফ্রন্টএন্ড | React + Vite + TypeScript + Tailwind CSS |
| ব্যাকএন্ড ও ডাটাবেস | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Sheet অটো-সিঙ্ক | Supabase Edge Functions |
| ইমেইল | Brevo |
| হোস্টিং | Netlify |

## রিপোর গঠন

```
apps/web/              React অ্যাপ — হোম, সেলার প্যানেল, কাস্টমার পেজ, অ্যাডমিন প্যানেল
supabase/migrations/   ডাটাবেসের টেবিল ও নিয়মের SQL
supabase/functions/    Edge Functions (Sheet সিঙ্ক, মেইল ইত্যাদি)
packages/shared/       দুই দিকে ব্যবহৃত সাধারণ কোড
docs/                  সেটআপ গাইড, পরিবেশের ভেরিয়েবল, ডেপ্লয় চেকলিস্ট
netlify.toml           Netlify বিল্ড ও রিডাইরেক্ট নিয়ম
```

## লোকালে চালানো

```bash
git clone https://github.com/diu-shpranto/orderlink-standalone.git
cd orderlink-standalone
npm install --ignore-scripts
cp apps/web/.env.example apps/web/.env   # Phase 1 থেকে Supabase চাবি বসবে
npm run dev
```

তারপর ব্রাউজারে `http://localhost:5173` খুলুন। বিস্তারিত: [`docs/setup.md`](docs/setup.md)।

## ডেপ্লয়

ডেপ্লয় টার্গেট **আগের Netlify সাইট `orderlinkbd`** — ঠিকানা: https://orderlinkbd.netlify.app — নতুন সাইট লাগবে না। Netlify এই রিপো থেকে অটো-ডেপ্লয় করবে (`netlify.toml`-এর সেটিংস অনুযায়ী)। ডেপ্লয় চেকলিস্ট: [`docs/deploy-checklist.md`](docs/deploy-checklist.md)।

## রোডম্যাপ (পরিকল্পনা অনুযায়ী)

| ধাপ | কাজ |
|---|---|
| **Phase 0** ✅ | ভিত্তি — রিপো, ফাঁকা অ্যাপ, ডেপ্লয় কাঠামো |
| Phase 1 | অ্যাকাউন্ট — সাইনআপ/লগইন (ইমেইল + Google), পাসওয়ার্ড রিসেট, সেটআপ উইজার্ড, RLS |
| Phase 2 | প্রোডাক্ট ও পেজ — CRUD, গ্যালারি, ৮ টেমপ্লেটের বিল্ডার, পাবলিক পেজ `/<shop>/<product>` |
| Phase 3 | অর্ডার — অর্ডার ফর্ম, ধন্যবাদ পেজ, সেলারের অর্ডার তালিকা ও স্ট্যাটাস |
| Phase 4 | Sheet অটো-সিঙ্ক — Google OAuth, per-day ট্যাব, কিউ ও রিট্রাই |
| Phase 5 | মনিটাইজেশন — মাসিক সাবস্ক্রিপশন, TrxID পেমেন্ট ও অনুমোদনের কিউ |
| Phase 6 | অ্যাডমিন — গোপন ঠিকানার প্যানেল, ভূমিকা ও অনুমতি, Zero Customer Data যাচাই |
| Phase 7 | লঞ্চ প্রস্তুতি — পলিশ, নিরাপত্তা পরীক্ষা, ব্যাকআপ, সুইচের ঘোষণা |

---

# Orderlink — Standalone Rebuild (English)

**Orderlink** lets Facebook sellers build product landing pages without coding, and every order lands automatically in the seller's own Google Sheet. This repo is the **standalone rebuild** of that app — re-built under the owner's own account, instead of the original version that runs inside Muse.

> **Status: Phase 0 — foundation (scaffold).** Empty-app structure is in place. Features start in Phase 1.

## Principles (from the plan)

- **Keep It Simple** — no features beyond the plan.
- **Auto-sync is mandatory** — orders go to the database first, then to the seller's Sheet (a separate tab per day).
- **One simple monthly subscription** — Starter ৳99, Basic ৳199, Growth ৳399, Business ৳699. No page credits, no separate hosting fee, no per-order charge, no commission.
- **Zero Customer Data** — admins can never see customer names, phones, addresses or order details.
- **Secrets never go in code** — API keys, OAuth secrets and service-role keys live only in `.env` (local) and in Netlify/Supabase secret settings.

## Stack

| Part | Technology |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend & database | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Sheet auto-sync | Supabase Edge Functions |
| Email | Brevo |
| Hosting | Netlify |

## Run locally

```bash
git clone https://github.com/diu-shpranto/orderlink-standalone.git
cd orderlink-standalone
npm install --ignore-scripts
cp apps/web/.env.example apps/web/.env   # Supabase keys go here from Phase 1
npm run dev
```

Then open `http://localhost:5173`. Full guide: [`docs/setup.md`](docs/setup.md).

## Deploy

Deploy target is the **existing Netlify site `orderlinkbd`** — https://orderlinkbd.netlify.app — no new site needed. Netlify auto-deploys from this repo using `netlify.toml`. Checklist: [`docs/deploy-checklist.md`](docs/deploy-checklist.md).
