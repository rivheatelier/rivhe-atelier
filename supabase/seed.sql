-- Starter catalogue: the two pieces photographed so far. Names and details are
-- placeholders — edit them in /admin/products. Prices are in US dollars; Rupiah
-- amounts are calculated at checkout from the live exchange rate.
insert into public.products (slug, name, price_usd, description, details, category, weight_grams, images, status, sort_order)
values
  (
    'pastel-horizon-bag',
    'Pastel Horizon Bag',
    40,
    'A hand-crocheted bag in a soft palette of pastel hues, made to brighten your everyday. Each piece is uniquely crafted, with love and care in every stitch.',
    E'100% handmade\nCotton yarn\nWooden ring handle\nSize: 28 cm (W) × 20 cm (H)',
    'Bags',
    450,
    array['/seed/pastel-horizon-1.jpg', '/seed/pastel-horizon-2.jpg'],
    'available',
    0
  ),
  (
    'seaglass-weave-bag',
    'Seaglass Weave Bag',
    45,
    'Vertical bands of sage, mint, cream and slate, worked in a textured basketweave stitch and finished with a hand-wrapped wooden handle.',
    E'100% handmade\nCotton yarn\nWooden handle',
    'Bags',
    450,
    array['/seed/seaglass-weave-1.jpg', '/seed/seaglass-weave-2.jpg'],
    'available',
    1
  )
on conflict (slug) do nothing;
