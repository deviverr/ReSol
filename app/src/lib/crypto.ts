// Random 6-digit handoff code shown to the buyer.
export function generateCode(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return n.toString().padStart(6, "0");
}

// sha256(code) as a byte array — matches the on-chain `[u8; 32]` code_hash
// (Solana's hash::hash is SHA-256).
export async function sha256Bytes(input: string): Promise<number[]> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest));
}

// A JS-safe u64 item id for the on-chain listing (also the Supabase onchain_item_id).
export function generateItemId(): number {
  // 41 bits of time + 11 bits of randomness, well within Number.MAX_SAFE_INTEGER.
  const t = Date.now() & 0x1ffffffffff;
  const r = Math.floor(Math.random() * 2048);
  return t * 2048 + r;
}
