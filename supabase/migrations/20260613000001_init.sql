-- Resol marketplace schema, RLS and mutation RPCs.
-- Wallet identity comes from Supabase "Sign in with Solana" (signInWithWeb3).

-- ============================================================
-- Wallet helper: resolve the caller's wallet from the web3 identity.
-- Centralised so the exact claim location is patched in one place.
-- ============================================================
create or replace function public.current_wallet()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    -- Sign in with Solana stores the wallet under custom_claims on the auth
    -- identity. identity_data is not user-editable, so it's safe for RLS.
    (select i.identity_data -> 'custom_claims' ->> 'address'
       from auth.identities i
      where i.user_id = auth.uid()
        and i.provider = 'web3'
      limit 1),
    -- fallback to the same claim carried in the JWT
    auth.jwt() -> 'user_metadata' -> 'custom_claims' ->> 'address'
  );
$$;

-- ============================================================
-- Tables
-- ============================================================
create table if not exists public.listings (
  id              uuid primary key default gen_random_uuid(),
  onchain_item_id bigint not null unique,
  seller_wallet   text not null,
  title           text not null,
  description     text,
  price_usdc      numeric not null check (price_usdc > 0),
  category        text not null,
  photo_urls      text[] not null default '{}',
  lat             float8,
  lng             float8,
  status          text not null default 'Active'
                    check (status in ('Active','Reserved','Sold')),
  created_at      timestamptz not null default now()
);

create table if not exists public.escrows (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings(id) on delete cascade,
  buyer_wallet  text not null,
  release_code  text not null,
  status        text not null default 'Reserved'
                  check (status in ('Reserved','Released','Cancelled')),
  reserved_at   timestamptz not null default now()
);

create table if not exists public.ratings (
  id            uuid primary key default gen_random_uuid(),
  rater_wallet  text not null,
  ratee_wallet  text not null,
  listing_id    uuid references public.listings(id) on delete set null,
  stars         int not null check (stars between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now()
);

create table if not exists public.profiles (
  wallet        text primary key,
  display_name  text
);

create index if not exists listings_status_idx     on public.listings(status);
create index if not exists listings_created_idx     on public.listings(created_at desc);
create index if not exists escrows_listing_idx       on public.escrows(listing_id);
create index if not exists escrows_buyer_idx         on public.escrows(buyer_wallet);
create index if not exists ratings_ratee_idx         on public.ratings(ratee_wallet);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.listings enable row level security;
alter table public.escrows  enable row level security;
alter table public.ratings  enable row level security;
alter table public.profiles enable row level security;

-- listings: world-readable; only the owning wallet may insert/edit.
create policy listings_select on public.listings
  for select using (true);
create policy listings_insert on public.listings
  for insert to authenticated
  with check (seller_wallet = public.current_wallet());
create policy listings_update_own on public.listings
  for update to authenticated
  using (seller_wallet = public.current_wallet())
  with check (seller_wallet = public.current_wallet());

-- escrows: ONLY the buyer can read their row (this protects release_code).
-- All writes go through SECURITY DEFINER rpcs below (no direct write policy).
create policy escrows_select_buyer on public.escrows
  for select to authenticated
  using (buyer_wallet = public.current_wallet());

-- ratings: world-readable (powers profile averages); rater must be the caller.
create policy ratings_select on public.ratings
  for select using (true);
create policy ratings_insert on public.ratings
  for insert to authenticated
  with check (rater_wallet = public.current_wallet());

-- profiles: world-readable; only the owning wallet may upsert.
create policy profiles_select on public.profiles
  for select using (true);
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (wallet = public.current_wallet());
create policy profiles_update on public.profiles
  for update to authenticated
  using (wallet = public.current_wallet())
  with check (wallet = public.current_wallet());

-- ============================================================
-- Mutation RPCs (SECURITY DEFINER) for cross-actor status changes.
-- These mirror the on-chain transitions and are called after the
-- corresponding Solana transaction confirms.
-- ============================================================

-- Buyer reserves a listing: create the escrow (storing the plaintext code,
-- only ever readable by this buyer) and flip the listing to Reserved.
create or replace function public.reserve_listing(
  p_listing_id uuid,
  p_release_code text
) returns public.escrows
language plpgsql security definer set search_path = public as $$
declare
  v_wallet  text := public.current_wallet();
  v_listing public.listings;
  v_escrow  public.escrows;
begin
  if v_wallet is null then raise exception 'not authenticated'; end if;
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then raise exception 'listing not found'; end if;
  if v_listing.status <> 'Active' then raise exception 'listing is not active'; end if;
  if v_listing.seller_wallet = v_wallet then raise exception 'cannot reserve your own listing'; end if;

  insert into public.escrows(listing_id, buyer_wallet, release_code, status, reserved_at)
  values (p_listing_id, v_wallet, p_release_code, 'Reserved', now())
  returning * into v_escrow;

  update public.listings set status = 'Reserved' where id = p_listing_id;
  return v_escrow;
end; $$;

-- Either party finalises after a successful on-chain release.
create or replace function public.complete_listing(p_listing_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_wallet  text := public.current_wallet();
  v_listing public.listings;
begin
  if v_wallet is null then raise exception 'not authenticated'; end if;
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then raise exception 'listing not found'; end if;
  if v_wallet <> v_listing.seller_wallet
     and not exists (select 1 from public.escrows e
                     where e.listing_id = p_listing_id and e.buyer_wallet = v_wallet) then
    raise exception 'not a party to this listing';
  end if;
  update public.listings set status = 'Sold' where id = p_listing_id;
  update public.escrows  set status = 'Released'
    where listing_id = p_listing_id and status = 'Reserved';
end; $$;

-- Buyer cancels their reservation (or a stale auto-refund): reopen the listing.
create or replace function public.cancel_reservation(p_listing_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_wallet text := public.current_wallet();
begin
  if v_wallet is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.escrows e
                 where e.listing_id = p_listing_id
                   and e.buyer_wallet = v_wallet
                   and e.status = 'Reserved') then
    raise exception 'no active reservation for caller';
  end if;
  update public.escrows  set status = 'Cancelled'
    where listing_id = p_listing_id and buyer_wallet = v_wallet and status = 'Reserved';
  update public.listings set status = 'Active' where id = p_listing_id;
end; $$;

grant execute on function public.reserve_listing(uuid, text)  to authenticated;
grant execute on function public.complete_listing(uuid)       to authenticated;
grant execute on function public.cancel_reservation(uuid)     to authenticated;
grant execute on function public.current_wallet()             to authenticated, anon;

-- ============================================================
-- Table privileges. RLS decides *which rows*; these GRANTs decide
-- whether the role may touch the table at all. Both are required.
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select on public.listings, public.ratings, public.profiles to anon, authenticated;
grant insert, update on public.listings to authenticated;
grant insert on public.ratings to authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.escrows to authenticated;

-- ============================================================
-- Aggregated ratings for profile pages.
-- ============================================================
create or replace view public.profile_ratings
with (security_invoker = true) as
  select ratee_wallet as wallet,
         round(avg(stars)::numeric, 2) as avg_stars,
         count(*)::int as rating_count
  from public.ratings
  group by ratee_wallet;

grant select on public.profile_ratings to anon, authenticated;
