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
