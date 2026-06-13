// Verifies the Supabase layer the frontend depends on:
//  - signInWithWeb3 (Sign in with Solana) works on the local stack
//  - current_wallet() resolves the signed-in wallet
//  - RLS: only the buyer can read escrows.release_code (seller cannot)
//  - the reserve_listing RPC creates the escrow + flips the listing
//
// Run: node scripts/verify-supabase.mjs
import { createClient } from "@supabase/supabase-js";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const STATEMENT = "Sign in to Resol — secure, local, secondhand trading.";

function walletFor(kp) {
  return {
    publicKey: { toBase58: () => kp.publicKey.toBase58() },
    signMessage: async (msg) => nacl.sign.detached(msg, kp.secretKey),
  };
}

function client() {
  return createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(sb, kp) {
  const { data, error } = await sb.auth.signInWithWeb3({
    chain: "solana",
    statement: STATEMENT,
    wallet: walletFor(kp),
    options: { url: "http://localhost:3100" },
  });
  if (error) throw new Error("signInWithWeb3: " + error.message);
  return data;
}

let failures = 0;
const check = (label, cond) => {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failures++;
};

async function main() {
  const seller = Keypair.generate();
  const buyer = Keypair.generate();

  // ---- seller signs in ----
  const sellerSb = client();
  const sellerSession = await signIn(sellerSb, seller);
  check("seller signInWithWeb3 returns a session", !!sellerSession.session);

  const { data: cw } = await sellerSb.rpc("current_wallet");
  check(
    `current_wallet() == seller (${cw} )`,
    cw === seller.publicKey.toBase58()
  );

  // ---- seller inserts a listing (RLS: seller_wallet must equal caller) ----
  const itemId = Date.now();
  const { data: listing, error: insErr } = await sellerSb
    .from("listings")
    .insert({
      onchain_item_id: itemId,
      seller_wallet: seller.publicKey.toBase58(),
      title: "RLS test lamp",
      description: "verify",
      price_usdc: 1.5,
      category: "Other",
      photo_urls: [],
      lat: 37.77,
      lng: -122.42,
    })
    .select()
    .single();
  check("seller can insert their own listing", !insErr && !!listing);
  if (insErr) console.log("   insert error:", insErr.message);

  // seller inserting a listing as a DIFFERENT wallet must fail
  const { error: badInsErr } = await sellerSb.from("listings").insert({
    onchain_item_id: itemId + 1,
    seller_wallet: buyer.publicKey.toBase58(),
    title: "spoofed",
    price_usdc: 1,
    category: "Other",
  });
  check("seller cannot insert a listing for another wallet", !!badInsErr);

  if (!listing) {
    summary();
    return;
  }

  // ---- buyer signs in and reserves ----
  const buyerSb = client();
  await signIn(buyerSb, buyer);
  const { data: escrow, error: rpcErr } = await buyerSb.rpc("reserve_listing", {
    p_listing_id: listing.id,
    p_release_code: "424242",
  });
  check("buyer reserve_listing rpc succeeds", !rpcErr && !!escrow);
  if (rpcErr) console.log("   rpc error:", rpcErr.message);

  const { data: relisting } = await buyerSb
    .from("listings")
    .select("status")
    .eq("id", listing.id)
    .single();
  check("listing flipped to Reserved", relisting?.status === "Reserved");

  // ---- buyer CAN read the release_code ----
  const { data: buyerEscrows } = await buyerSb
    .from("escrows")
    .select("release_code")
    .eq("listing_id", listing.id);
  check(
    "buyer can read release_code",
    buyerEscrows?.length === 1 && buyerEscrows[0].release_code === "424242"
  );

  // ---- seller CANNOT read the release_code (RLS) ----
  const { data: sellerEscrows } = await sellerSb
    .from("escrows")
    .select("release_code")
    .eq("listing_id", listing.id);
  check(
    "seller CANNOT read release_code (RLS-protected)",
    !sellerEscrows || sellerEscrows.length === 0
  );

  // ---- complete + cancel paths ----
  const { error: cancelErr } = await buyerSb.rpc("cancel_reservation", {
    p_listing_id: listing.id,
  });
  check("buyer can cancel reservation", !cancelErr);
  const { data: afterCancel } = await buyerSb
    .from("listings")
    .select("status")
    .eq("id", listing.id)
    .single();
  check("listing reopened to Active after cancel", afterCancel?.status === "Active");

  summary();
}

function summary() {
  console.log(
    failures === 0
      ? "\n🎉 All Supabase/RLS checks passed."
      : `\n⚠️  ${failures} check(s) failed.`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
