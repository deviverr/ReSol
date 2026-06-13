import { PublicKey } from "@solana/web3.js";

export const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
    "BJbjgczJvjSb4GXPcjDWLPUQdfKRe7SFPCXQqZLcsrBw"
);
export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ??
    "B3rGdGRvZjkP1N2BJiRqyeQAm9sCeeP1vbkwzQcWSnSD"
);
export const TREASURY = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY ??
    "FvSfLTD5HQGCJa89WP3UzMFrBM12vavjKdvH4iQeizBb"
);

export const USDC_DECIMALS = 6;
export const FEE_BPS = 150; // 1.5%

export const CATEGORIES = [
  "Electronics",
  "Furniture",
  "Clothing",
  "Books",
  "Sports",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<string, string> = {
  Electronics: "💻",
  Furniture: "🛋️",
  Clothing: "👕",
  Books: "📚",
  Sports: "🏀",
  Other: "✨",
};
