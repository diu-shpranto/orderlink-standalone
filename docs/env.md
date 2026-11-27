# পরিবেশের ভেরিয়েবল (Environment Variables)

> ⚠️ **এই ফাইলে শুধু নামের তালিকা — কোনো আসল মান নয়।** আসল মান শুধু `.env` ফাইলে (লোকালে, Git-এর বাইরে) আর Netlify/Supabase-এর সিক্রেট সেটিংসে থাকবে। কখনো চ্যাটে, কোডে বা GitHub-এ আসল চাবি বসাবেন না।

## ফ্রন্টএন্ড (`apps/web/.env`)

| ভেরিয়েবল | কাজ | কখন লাগবে |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase প্রজেক্টের URL | Phase 1 থেকে |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key | Phase 1 থেকে |

## সার্ভার-শুধু (কখনো ব্রাউজারের কোডে নয়)

| ভেরিয়েবল | কাজ | কখন লাগবে |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key — শুধু Edge Functions-এ | Phase 1 থেকে |
| `BREVO_API_KEY` | Brevo Transactional API key (মেইল পাঠানো) | Phase 1 থেকে |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (Google লগইন + Sheet সংযোগ) | Phase 1 / Phase 4 থেকে |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Phase 1 / Phase 4 থেকে |

## নোট

- `VITE_` দিয়ে শুরু ভেরিয়েবল ব্রাউজারে যায় — তাই সেখানে শুধু public (anon) key বসবে, গোপন কিছু নয়।
- Service-role key, Brevo key, Google secret — এগুলো ভুলেও `VITE_` নামে বা ফ্রন্টএন্ড কোডে বসাবেন না।

# docs/env.md-এ যোগ করার অংশ (Phase 1)

> নিচের অংশটুকু `docs/env.md`-এর শেষে যোগ করুন। URL/ref আসল মান (public
> পরিচয়, গোপন কিছু নয়) — চাবি/সিক্রেটের জায়গায় শুধু "কোথা থেকে নিতে হবে"
> লেখা আছে, মান বসানো হয়নি।

## এই প্রজেক্টের Supabase (Phase 1)

| জিনিস | মান |
|---|---|
| প্রজেক্টের নাম | orderlink |
| Project ref | `xrkdoijcdokuvsahmepw` |
| Project URL | `https://xrkdoijcdokuvsahmepw.supabase.co` |
| Organization | diu-shpranto's Org |
| Region | Southeast Asia (Singapore) |
| Plan | Free |

`apps/web/.env`-এ বসবে:

```env
VITE_SUPABASE_URL=https://xrkdoijcdokuvsahmepw.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase Dashboard → Settings → API → anon public key>
```

## সার্ভার-শুধু — Phase 1-এর বাড়তি ভেরিয়েবল

| ভেরিয়েবল | কাজ | কোথা থেকে |
|---|---|---|
| `BREVO_SENDER_EMAIL` | রিসেট মেইলের প্রেরক ঠিকানা | আগে থেকে ভেরিফাই করা সেন্ডার — যেমন `hello.orderlink@yahoo.com` (পরিকল্পনার §২ দেখুন) |
| `BREVO_API_KEY` | Brevo Transactional API key | Brevo Dashboard → Settings → API Keys (নতুন key বানাতে হবে) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions-এর service-role key | Supabase Dashboard → Settings → API → service_role (গোপন — কখনো ফ্রন্টএন্ডে নয়) |

Edge Functions-এ সিক্রেট বসানো:

```bash
supabase secrets set BREVO_API_KEY=... BREVO_SENDER_EMAIL=...
# SUPABASE_URL ও SUPABASE_SERVICE_ROLE_KEY Supabase নিজেই ফাংশনে দেয়।
```

## Google লগইন — callback URL (GCP-তে বসাতে হবে)

Google OAuth ক্লায়েন্ট আছে GCP প্রজেক্ট **orderlink-516005**-এ। ওই ক্লায়েন্টের
**Authorized redirect URIs**-এ এই ঠিকানাটা যোগ করতে হবে (না হলে Google
লগইন কাজ করবে না):

```text
https://xrkdoijcdokuvsahmepw.supabase.co/auth/v1/callback
```

আর Supabase Dashboard → Authentication → Providers → Google-এ ওই একই
GCP ক্লায়েন্টের Client ID ও Client Secret বসাতে হবে (Client ID/Secret
কখনো কোডে বা GitHub-এ নয় — শুধু Supabase-এর সেটিংসে)।

## Auth সেটিংস (Supabase Dashboard)

- Authentication → Providers → Email → **"Confirm email" বন্ধ রাখুন**
  (লাইভ অ্যাপের মতো — সাইনআপের পরপরই লগইন করা যাবে)। চালু রাখলে সাইনআপের
  পর ব্যবহারকারীকে ইনবক্সের লিংক চাপতে হবে; কোডের `needsConfirmation`
  বার্তা সেটাই জানাবে।
- Site URL: `http://localhost:5173` (লোকালে) — লাইভে Netlify ঠিকানা
  (`https://orderlinkbd.netlify.app`) বসাতে হবে।
