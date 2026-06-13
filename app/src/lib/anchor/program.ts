import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import idl from "./resol_escrow.json";
import type { ResolEscrow } from "./resol_escrow";
import { PROGRAM_ID, USDC_MINT, TREASURY, USDC_DECIMALS } from "../constants";

export function getProgram(
  connection: Connection,
  wallet: AnchorWallet
): Program<ResolEscrow> {
  const provider = new AnchorProvider(connection, wallet as Wallet, {
    commitment: "confirmed",
  });
  return new Program<ResolEscrow>(idl as ResolEscrow, provider);
}

// ---- PDAs ----
const u64le = (n: number | BN) =>
  (BN.isBN(n) ? n : new BN(n)).toArrayLike(Buffer, "le", 8);

export function listingPda(itemId: number | BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), u64le(itemId)],
    PROGRAM_ID
  )[0];
}

export function vaultAuthPda(itemId: number | BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_auth"), u64le(itemId)],
    PROGRAM_ID
  )[0];
}

export function vaultAta(itemId: number | BN): PublicKey {
  return getAssociatedTokenAddressSync(USDC_MINT, vaultAuthPda(itemId), true);
}

export function ataFor(owner: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(USDC_MINT, owner);
}

export function toBaseUnits(usdc: number): BN {
  return new BN(Math.round(usdc * 10 ** USDC_DECIMALS));
}

// Read the on-chain listing account (seller needs the stored buyer pubkey for
// `release`, since they can't read the RLS-protected escrow row).
export async function fetchOnchainListing(
  program: Program<ResolEscrow>,
  itemId: number | BN
) {
  return program.account.listing.fetch(listingPda(itemId));
}

// ---- Instruction senders ----
export async function sendCreateListing(
  program: Program<ResolEscrow>,
  seller: PublicKey,
  itemId: BN,
  priceUsdc: number
): Promise<string> {
  return program.methods
    .createListing(itemId, toBaseUnits(priceUsdc))
    .accounts({ seller })
    .rpc();
}

export async function sendReserve(
  program: Program<ResolEscrow>,
  buyer: PublicKey,
  itemId: BN,
  codeHash: number[]
): Promise<string> {
  return program.methods
    .reserve(itemId, codeHash)
    .accountsPartial({
      listing: listingPda(itemId),
      buyer,
      usdcMint: USDC_MINT,
      buyerTokenAccount: ataFor(buyer),
      vaultAuthority: vaultAuthPda(itemId),
      vault: vaultAta(itemId),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function sendRelease(
  program: Program<ResolEscrow>,
  caller: PublicKey,
  itemId: BN,
  code: string,
  seller: PublicKey,
  buyer: PublicKey
): Promise<string> {
  return program.methods
    .release(itemId, code)
    .accountsPartial({
      listing: listingPda(itemId),
      caller,
      usdcMint: USDC_MINT,
      seller,
      buyer,
      sellerTokenAccount: ataFor(seller),
      treasury: TREASURY,
      treasuryTokenAccount: ataFor(TREASURY),
      vaultAuthority: vaultAuthPda(itemId),
      vault: vaultAta(itemId),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function sendCancel(
  program: Program<ResolEscrow>,
  buyer: PublicKey,
  itemId: BN
): Promise<string> {
  return program.methods
    .cancelReservation(itemId)
    .accountsPartial({
      listing: listingPda(itemId),
      buyer,
      usdcMint: USDC_MINT,
      buyerTokenAccount: ataFor(buyer),
      vaultAuthority: vaultAuthPda(itemId),
      vault: vaultAta(itemId),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function sendAutoRefund(
  program: Program<ResolEscrow>,
  caller: PublicKey,
  itemId: BN,
  buyer: PublicKey
): Promise<string> {
  return program.methods
    .autoRefund(itemId)
    .accountsPartial({
      listing: listingPda(itemId),
      caller,
      usdcMint: USDC_MINT,
      buyer,
      buyerTokenAccount: ataFor(buyer),
      vaultAuthority: vaultAuthPda(itemId),
      vault: vaultAta(itemId),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
