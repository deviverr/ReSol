import { supabase } from "./supabaseClient";
import type { Listing, Escrow, Profile } from "./types";

// ---------------- Listings ----------------
export async function fetchActiveListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "Active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Listing[];
}

export async function fetchListing(id: string): Promise<Listing | null> {
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
