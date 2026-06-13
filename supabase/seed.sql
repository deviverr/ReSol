-- Demo listings so the Browse feed has content during local development.
-- These are illustrative (no on-chain counterpart); real listings are created
-- through the Sell flow, which calls create_listing on-chain first.
insert into public.listings
  (onchain_item_id, seller_wallet, title, description, price_usdc, category, photo_urls, lat, lng, status)
values
  (900000001, '7xKXtg2CW3fhe1nVe9b2nQ3fG5kP9rTuVwXyZ1aBcD2', 'Vintage film camera',
   'Olympus OM-10 in great condition. Comes with a 50mm lens and a fresh battery. Light meter works perfectly.',
   85, 'Electronics', array['https://picsum.photos/seed/camera/600/600'], 37.7765, -122.4172, 'Active'),
  (900000002, '7xKXtg2CW3fhe1nVe9b2nQ3fG5kP9rTuVwXyZ1aBcD2', 'Mid-century oak chair',
   'Solid oak accent chair, restored. Sturdy and beautiful — a real statement piece for any room.',
   60, 'Furniture', array['https://picsum.photos/seed/chair/600/600'], 37.7849, -122.4094, 'Active'),
  (900000003, '9aBcDef2GhiJkLmNoPqRsTuVwXyZ1aBcDeFgHiJkLmN', 'Denim jacket (M)',
   'Classic medium-wash denim jacket, barely worn. Fits a men''s medium. No rips or stains.',
   28, 'Clothing', array['https://picsum.photos/seed/jacket/600/600'], 37.7699, -122.4469, 'Active'),
  (900000004, '9aBcDef2GhiJkLmNoPqRsTuVwXyZ1aBcDeFgHiJkLmN', 'Sci-fi paperback bundle',
   'Twelve classic sci-fi paperbacks — Asimov, Le Guin, Herbert and more. Some shelf wear.',
   18, 'Books', array['https://picsum.photos/seed/books/600/600'], 37.7935, -122.3960, 'Active'),
  (900000005, 'Hk3pLmNoP2qRsTuVwXyZ1aBcDeFgHiJkLmNoPqRsTuV', 'Basketball + pump',
   'Official size Wilson basketball with a hand pump. Good grip, holds air great. Ready to ball.',
   15, 'Sports', array['https://picsum.photos/seed/ball/600/600'], 37.7620, -122.4350, 'Active'),
  (900000006, 'Hk3pLmNoP2qRsTuVwXyZ1aBcDeFgHiJkLmNoPqRsTuV', 'Bluetooth speaker',
   'Portable JBL-style speaker, water resistant. Punchy bass, ~10h battery. Charger included.',
   40, 'Electronics', array['https://picsum.photos/seed/speaker/600/600'], 37.7811, -122.4090, 'Active'),
  (900000007, 'Hk3pLmNoP2qRsTuVwXyZ1aBcDeFgHiJkLmNoPqRsTuV', 'Wooden bookshelf',
   'Three-shelf pine bookshelf. Easy to move, fits most rooms. Minor scuff on one corner.',
   45, 'Furniture', array['https://picsum.photos/seed/shelf/600/600'], 37.7580, -122.4180, 'Active');
