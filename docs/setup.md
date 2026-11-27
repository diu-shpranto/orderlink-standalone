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
