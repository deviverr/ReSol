export type ListingStatus = "Active" | "Reserved" | "Sold";

export interface Listing {
  id: string;
  onchain_item_id: number;
  seller_wallet: string;
  title: string;
  description: string | null;
  price_usdc: number;
  category: string;
  photo_urls: string[];
  lat: number | null;
  lng: number | null;
  status: ListingStatus;
  created_at: string;
}

export interface Escrow {
  id: string;
  listing_id: string;
  buyer_wallet: string;
  release_code: string;
  status: "Reserved" | "Released" | "Cancelled";
  reserved_at: string;
}

export interface Rating {
  id: string;
  rater_wallet: string;
  ratee_wallet: string;
  listing_id: string | null;
  stars: number;
  comment: string | null;
  created_at: string;
}

export interface Profile {
  wallet: string;
  display_name: string | null;
}

// A listing joined with its escrow, used in My Activity.
export interface ListingWithEscrow extends Listing {
  escrow?: Escrow | null;
}
