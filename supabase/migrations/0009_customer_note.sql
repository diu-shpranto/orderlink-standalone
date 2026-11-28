-- 0009: customer special note on orders.
-- The order form's "বিশেষ নোট" section (optional textarea). Nullable text;
-- null = the customer left it blank. Shown in the seller order detail and
-- synced to the seller's Sheet as the last column. No existing data changes.
alter table public.orders add column if not exists customer_note text;
