-- A fixed US-dollar price per piece, shown to visitors browsing in USD.
-- The Rupiah price (products.price) is still what's charged by bank transfer.
alter table public.products
  add column price_usd numeric(10, 2) check (price_usd is null or price_usd >= 0);
