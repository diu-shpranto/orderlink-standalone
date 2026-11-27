# ডেপ্লয় চেকলিস্ট (Deploy Checklist)

ডেপ্লয় টার্গেট: **আগের Netlify সাইট `orderlinkbd`** — https://orderlinkbd.netlify.app — নতুন সাইট লাগবে না।

## Netlify-তে প্রথমবার যুক্ত করা (Phase 0-এর পর)

- [ ] Netlify ড্যাশবোর্ডে সাইট `orderlinkbd` খুলুন
- [ ] Site settings → Build & deploy → Continuous Deployment-এ GitHub রিপো `diu-shpranto/orderlink-standalone`-কে যুক্ত করুন
- [ ] Build settings যাচাই করুন (`netlify.toml` থেকে আসবে):
  - Base directory: `apps/web`
  - Build command: `npm install --ignore-scripts && npm run build`
  - Publish directory: `apps/web/dist` (netlify.toml-এ `dist`, base-এর সাপেক্ষে)
- [ ] Environment variables বসান (Netlify → Site settings → Environment variables):
  - `VITE_SUPABASE_URL` (Phase 1 থেকে)
  - `VITE_SUPABASE_ANON_KEY` (Phase 1 থেকে)
- [ ] `main` ব্রাঞ্চে পুশ করলে অটো-ডেপ্লয় হবে কি না যাচাই করুন
- [ ] https://orderlinkbd.netlify.app খুলে দেখুন — অ্যাপ আসে কি না

## প্রতিটা Phase-এর পর

- [ ] লোকালে `npm run build` সফল
- [ ] `main`-এ পুশ → Netlify ডেপ্লয় সফল
- [ ] লাইভ ঠিকানায় পরিকল্পনার গ্রহণের পরীক্ষা (acceptance test) পাস
- [ ] কোনো সিক্রেট কমিট হয়নি (`git log` ও GitHub-এ যাচাই)

## মনে রাখার বিষয়

- `netlify.toml`-এর `/* → /index.html` রিডাইরেক্টের কারণে `/<shop>/<product>` লিংক সরাসরি খুলবে।
- ল্যান্ডিং পেজের পুরনো ডেপ্লয় (Netlify Drop দিয়ে দেওয়া একক HTML) এই রিপো ডেপ্লয় শুরু হলে বদলে যাবে — সেটাই উদ্দেশ্য: আসল অ্যাপটাই ওই ঠিকানায় চলবে।
