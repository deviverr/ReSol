import { isPlaceholderSupabase, supabase } from "./supabaseClient";
import type { Listing, Escrow, Profile } from "./types";

const PLACEHOLDER_LISTINGS: Listing[] = [
  {
    id: "demo-lavender-speaker",
    onchain_item_id: 9001,
    seller_wallet: "DemoSeller111111111111111111111111111111111",
    title: "Portable bluetooth speaker",
    description:
      "Clean demo listing with a fresh battery, soft case, and meetup-ready pickup details.",
    price_usdc: 42,
    category: "Electronics",
    photo_urls: [],
    lat: 40.7128,
    lng: -74.006,
    status: "Active",
    created_at: "2026-06-10T14:00:00.000Z",
  },
  {
    id: "demo-oak-chair",
    onchain_item_id: 9002,
    seller_wallet: "DemoSeller222222222222222222222222222222222",
    title: "Compact oak desk chair",
    description:
      "Comfortable secondhand chair for a small workspace. Minor wear, sturdy frame.",
    price_usdc: 68,
    category: "Furniture",
    photo_urls: [],
    lat: 40.7306,
    lng: -73.9352,
    status: "Active",
    created_at: "2026-06-09T16:30:00.000Z",
  },
  {
    id: "demo-denim-jacket",
    onchain_item_id: 9003,
    seller_wallet: "DemoSeller333333333333333333333333333333333",
    title: "Vintage denim jacket",
    description:
      "Medium fit, washed blue denim, ready for another season instead of another closet.",
    price_usdc: 35,
    category: "Clothing",
    photo_urls: [],
    lat: 40.758,
    lng: -73.9855,
    status: "Active",
    created_at: "2026-06-08T11:45:00.000Z",
  },
  {
    id: "demo-design-books",
    onchain_item_id: 9004,
    seller_wallet: "DemoSeller444444444444444444444444444444444",
    title: "Design book bundle",
    description:
      "Four gently used visual design books with clean pages and lots of margin notes.",
    price_usdc: 24,
    category: "Books",
    photo_urls: [],
    lat: 40.6782,
    lng: -73.9442,
    status: "Active",
    created_at: "2026-06-07T19:15:00.000Z",
  },
];

// ---------------- Listings ----------------
export async function fetchActiveListings(): Promise<Listing[]> {
  if (isPlaceholderSupabase) return PLACEHOLDER_LISTINGS;

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "Active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Listing[];
}

export async function fetchListing(id: string): Promise<Listing | null> {
  if (isPlaceholderSupabase) {
    return PLACEHOLDER_LISTINGS.find((listing) => listing.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Listing | null;
}

export async function insertListing(row: {
  onchain_item_id: number;
  seller_wallet: string;
  title: string;
  description: string;
  price_usdc: number;
  category: string;
  photo_urls: string[];
  lat: number | null;
  lng: number | null;
}): Promise<Listing> {
  const { data, error } = await supabase
    .from("listings")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

export async function fetchMyListings(wallet: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_wallet", wallet)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Listing[];
}

// ---------------- Escrows (RPCs) ----------------
export async function reserveListing(
  listingId: string,
  releaseCode: string
): Promise<Escrow> {
  const { data, error } = await supabase.rpc("reserve_listing", {
    p_listing_id: listingId,
    p_release_code: releaseCode,
  });
  if (error) throw error;
  return data as Escrow;
}

export async function completeListing(listingId: string): Promise<void> {
  const { error } = await supabase.rpc("complete_listing", {
    p_listing_id: listingId,
  });
  if (error) throw error;
}

export async function cancelReservation(listingId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_reservation", {
    p_listing_id: listingId,
  });
  if (error) throw error;
}

// Buyer-only: read the escrow (and its release_code) for one of my listings.
export async function fetchMyEscrow(listingId: string): Promise<Escrow | null> {
  const { data, error } = await supabase
    .from("escrows")
    .select("*")
    .eq("listing_id", listingId)
    .order("reserved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Escrow | null;
}

// All escrows where I'm the buyer (My Purchases).
export async function fetchMyPurchases(): Promise<
  (Escrow & { listing: Listing })[]
> {
  const { data, error } = await supabase
    .from("escrows")
    .select("*, listing:listings(*)")
    .order("reserved_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Escrow & { listing: Listing })[];
}

// ---------------- Ratings ----------------
export async function insertRating(row: {
  rater_wallet: string;
  ratee_wallet: string;
  listing_id: string;
  stars: number;
  comment: string;
}): Promise<void> {
  const { error } = await supabase.from("ratings").insert(row);
  if (error) throw error;
}

export async function fetchRatingSummary(
  wallet: string
): Promise<{ avg: number | null; count: number }> {
  const { data, error } = await supabase
    .from("ratings")
    .select("stars")
    .eq("ratee_wallet", wallet);
  if (error) throw error;
  const rows = (data ?? []) as { stars: number }[];
  if (rows.length === 0) return { avg: null, count: 0 };
  const avg = rows.reduce((s, r) => s + r.stars, 0) / rows.length;
  return { avg, count: rows.length };
}

export async function fetchRatedListingIds(
  wallet: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("ratings")
    .select("listing_id")
    .eq("rater_wallet", wallet);
  if (error) throw error;
  return new Set(
    (data ?? [])
      .map((r) => (r as { listing_id: string | null }).listing_id)
      .filter((x): x is string => !!x)
  );
}

export async function hasRated(
  raterWallet: string,
  listingId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("ratings")
    .select("*", { count: "exact", head: true })
    .eq("rater_wallet", raterWallet)
    .eq("listing_id", listingId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ---------------- Profiles ----------------
export async function fetchProfile(wallet: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("wallet", wallet)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function upsertProfile(
  wallet: string,
  displayName: string
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .upsert({ wallet, display_name: displayName });
  if (error) throw error;
}

// ---------------- Storage ----------------
export async function uploadPhotos(
  wallet: string,
  files: File[]
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${wallet}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("listing-photos")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}
