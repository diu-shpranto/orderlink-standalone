# supabase/functions

সার্ভারের কাজগুলো (Edge Functions) এখানে থাকবে — পরিকল্পনা অনুযায়ী:

- **Sheet অটো-সিঙ্ক** (Phase 4) — অর্ডার জমা হলেই সেলারের Google Sheet-এর সেদিনের ট্যাবে সারি যোগ করা, ব্যর্থ হলে কিউ থেকে অটো-রিট্রাই। ফাংশন: `store-google-token`, `sync-order`, `sheets-retry`, `sheets-setup`, `sheets-disconnect` (দেখুন docs/setup.md-এর Phase 4 অংশ)।
- **রিসেট কোডের মেইল** (Phase 1) — Brevo দিয়ে পাসওয়ার্ড রিসেটের কোড পাঠানো।
- **পেমেন্ট নোটিফিকেশন** (Phase 5) — TrxID আবেদন ও অনুমোদনের নোটিফিকেশন।

Google টোকেন, Brevo চাবি ও service-role key শুধু সার্ভার ফাংশনে থাকবে — ব্রাউজারের কোডে কখনো আসবে না।

Phase 0-এ এই ফোল্ডার ফাঁকা — কোনো ফাংশন এখনো বানানো হয়নি।
