import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ResolEscrow } from "../target/types/resol_escrow";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { createHash } from "crypto";
import { assert } from "chai";
import fs from "fs";

// Keypairs we control so on-chain consts (mint, treasury) match.
function load(path: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf-8")))
  );
}

const sha256 = (s: string): number[] =>
  Array.from(createHash("sha256").update(s).digest());

describe("resol_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.ResolEscrow as Program<ResolEscrow>;
  const connection = provider.connection;

  const mintKp = load("../keys/test_usdc_mint.json");
  const treasuryKp = load("../keys/treasury.json");
  const USDC = mintKp.publicKey;
  const TREASURY = treasuryKp.publicKey;

  const seller = Keypair.generate();
  const buyer = Keypair.generate();
  const stranger = Keypair.generate();

  const PRICE = new anchor.BN(2_000_000); // 2 USDC (6 decimals)
  const DECIMALS = 6;

  let sellerAta: PublicKey;
  let buyerAta: PublicKey;
  let treasuryAta: PublicKey;

  // Unique item id per test so cases are independent.
  let nextId = 1000;
  const newId = () => new anchor.BN(nextId++);

  const listingPda = (id: anchor.BN) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), id.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];
  const vaultAuthPda = (id: anchor.BN) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("vault_auth"), id.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];
  const vaultAta = (id: anchor.BN) =>
    getAssociatedTokenAddressSync(USDC, vaultAuthPda(id), true);

  async function airdrop(pk: PublicKey, sol = 5) {
    const sig = await connection.requestAirdrop(pk, sol * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  }

  before(async () => {
    await Promise.all([
      airdrop(seller.publicKey),
      airdrop(buyer.publicKey),
      airdrop(stranger.publicKey),
      airdrop(provider.wallet.publicKey),
    ]);

    // Create the test USDC mint from our keypair so it matches USDC_MINT const.
    await createMint(
      connection,
      seller, // payer
      seller.publicKey, // mint authority
      null,
      DECIMALS,
      mintKp
    );

    sellerAta = (
      await getOrCreateAssociatedTokenAccount(connection, seller, USDC, seller.publicKey)
    ).address;
    buyerAta = (
      await getOrCreateAssociatedTokenAccount(connection, buyer, USDC, buyer.publicKey)
    ).address;
    treasuryAta = getAssociatedTokenAddressSync(USDC, TREASURY);

    // Fund the buyer with 100 USDC.
    await mintTo(connection, seller, USDC, buyerAta, seller, 100_000_000);
  });

  async function createListing(id: anchor.BN, price = PRICE) {
    await program.methods
      .createListing(id, price)
      .accounts({ seller: seller.publicKey })
      .signers([seller])
      .rpc();
  }

  async function reserve(id: anchor.BN, code: string, who = buyer) {
    await program.methods
      .reserve(id, sha256(code))
      .accounts({
        buyer: who.publicKey,
        usdcMint: USDC,
        buyerTokenAccount: getAssociatedTokenAddressSync(USDC, who.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([who])
      .rpc();
  }

  it("create_listing stores seller, price and Active status", async () => {
    const id = newId();
    await createListing(id);
    const l = await program.account.listing.fetch(listingPda(id));
    assert.ok(l.seller.equals(seller.publicKey));
    assert.ok(l.price.eq(PRICE));
    assert.deepEqual(l.status, { active: {} });
    assert.equal(l.itemId.toString(), id.toString());
  });

  it("create_listing rejects zero price", async () => {
    const id = newId();
    try {
      await createListing(id, new anchor.BN(0));
      assert.fail("expected InvalidPrice");
    } catch (e: any) {
      assert.include(e.toString(), "InvalidPrice");
    }
  });

  it("reserve moves USDC into the vault and flips to Reserved", async () => {
    const id = newId();
    await createListing(id);
    const before = (await getAccount(connection, buyerAta)).amount;
    await reserve(id, "123456");
    const l = await program.account.listing.fetch(listingPda(id));
    assert.deepEqual(l.status, { reserved: {} });
    assert.ok(l.buyer.equals(buyer.publicKey));
    const vault = await getAccount(connection, vaultAta(id));
    assert.equal(vault.amount.toString(), PRICE.toString());
    const after = (await getAccount(connection, buyerAta)).amount;
    assert.equal((before - after).toString(), PRICE.toString());
  });

  it("reserve fails when listing is not Active", async () => {
    const id = newId();
    await createListing(id);
    await reserve(id, "111111");
    try {
      // buyer already has a funded ATA, so this reaches the handler's status guard
      await reserve(id, "222222", buyer);
      assert.fail("expected NotActive");
    } catch (e: any) {
      assert.include(e.toString(), "NotActive");
    }
  });

  it("release splits funds 98.5 / 1.5 and marks Sold", async () => {
    const id = newId();
    const code = "654321";
    await createListing(id);
    await reserve(id, code);

    const sellerBefore = (await getAccount(connection, sellerAta)).amount;
    await program.methods
      .release(id, code)
      .accounts({
        caller: seller.publicKey,
        usdcMint: USDC,
        seller: seller.publicKey,
        buyer: buyer.publicKey,
        sellerTokenAccount: sellerAta,
        treasury: TREASURY,
        treasuryTokenAccount: treasuryAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    const l = await program.account.listing.fetch(listingPda(id));
    assert.deepEqual(l.status, { sold: {} });

    const fee = PRICE.toNumber() * 0.015;
    const sellerGain =
      Number((await getAccount(connection, sellerAta)).amount) -
      Number(sellerBefore);
    assert.equal(sellerGain, PRICE.toNumber() - fee);
    assert.equal(
      Number((await getAccount(connection, treasuryAta)).amount),
      fee
    );
  });

  it("release fails with the wrong code", async () => {
    const id = newId();
    await createListing(id);
    await reserve(id, "424242");
    try {
      await program.methods
        .release(id, "000000")
        .accounts({
          caller: seller.publicKey,
          usdcMint: USDC,
          seller: seller.publicKey,
          buyer: buyer.publicKey,
          sellerTokenAccount: sellerAta,
          treasury: TREASURY,
          treasuryTokenAccount: treasuryAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller])
        .rpc();
      assert.fail("expected InvalidCode");
    } catch (e: any) {
      assert.include(e.toString(), "InvalidCode");
    }
  });

  it("cancel_reservation refunds the buyer and reopens the listing", async () => {
    const id = newId();
    await createListing(id);
    const before = (await getAccount(connection, buyerAta)).amount;
    await reserve(id, "777777");
    await program.methods
      .cancelReservation(id)
      .accounts({
        buyer: buyer.publicKey,
        usdcMint: USDC,
        buyerTokenAccount: buyerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();
    const l = await program.account.listing.fetch(listingPda(id));
    assert.deepEqual(l.status, { active: {} });
    assert.ok(l.buyer.equals(PublicKey.default));
    const after = (await getAccount(connection, buyerAta)).amount;
    assert.equal(after.toString(), before.toString());
  });

  it("cancel_reservation rejects a non-buyer", async () => {
    const id = newId();
    await createListing(id);
    await reserve(id, "888888");
    try {
      await program.methods
        .cancelReservation(id)
        .accounts({
          buyer: stranger.publicKey,
          usdcMint: USDC,
          buyerTokenAccount: getAssociatedTokenAddressSync(USDC, stranger.publicKey),
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([stranger])
        .rpc();
      assert.fail("expected Unauthorized");
    } catch (e: any) {
      // address constraint violation surfaces as a constraint/seeds error
      assert.match(e.toString(), /Unauthorized|ConstraintAddress|AnchorError/);
    }
  });

  it("auto_refund is rejected before the 7-day window", async () => {
    const id = newId();
    await createListing(id);
    await reserve(id, "909090");
    try {
      await program.methods
        .autoRefund(id)
        .accounts({
          caller: stranger.publicKey,
          usdcMint: USDC,
          buyer: buyer.publicKey,
          buyerTokenAccount: buyerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([stranger])
        .rpc();
      assert.fail("expected RefundWindowNotElapsed");
    } catch (e: any) {
      assert.include(e.toString(), "RefundWindowNotElapsed");
    }
  });

  it("fee math is exact for an odd price", async () => {
    // 1_333_333 base units * 150 / 10000 = 19_999 (floor), seller gets 1_313_334
    const id = newId();
    const oddPrice = new anchor.BN(1_333_333);
    const code = "135790";
    await createListing(id, oddPrice);
    await program.methods
      .reserve(id, sha256(code))
      .accounts({
        buyer: buyer.publicKey,
        usdcMint: USDC,
        buyerTokenAccount: buyerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const tBefore = Number((await getAccount(connection, treasuryAta)).amount);
    const sBefore = Number((await getAccount(connection, sellerAta)).amount);
    await program.methods
      .release(id, code)
      .accounts({
        caller: seller.publicKey,
        usdcMint: USDC,
        seller: seller.publicKey,
        buyer: buyer.publicKey,
        sellerTokenAccount: sellerAta,
        treasury: TREASURY,
        treasuryTokenAccount: treasuryAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    const feePaid = Number((await getAccount(connection, treasuryAta)).amount) - tBefore;
    const sellerPaid = Number((await getAccount(connection, sellerAta)).amount) - sBefore;
    assert.equal(feePaid, 19_999);
    assert.equal(sellerPaid, 1_333_333 - 19_999);
  });
});
