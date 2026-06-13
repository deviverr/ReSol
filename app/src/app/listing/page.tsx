"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { BN } from "@coral-xyz/anchor";
import { Carousel } from "@/components/listing/Carousel";
import { Button } from "@/components/ui/Button";
import { Identicon } from "@/components/ui/Identicon";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { useProgram } from "@/lib/hooks/useProgram";
import { useAuth } from "@/components/providers/AuthProvider";
import { fetchListing, reserveListing } from "@/lib/data";
import { sendReserve } from "@/lib/anchor/program";
import { generateCode, sha256Bytes } from "@/lib/crypto";
import { shortenWallet, formatUsdc } from "@/lib/format";
import { CATEGORY_EMOJI } from "@/lib/constants";
import { toastError } from "@/lib/toast";
import type { Listing } from "@/lib/types";

export default function ListingPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ListingDetail />
    </Suspense>
  );
}

function ListingDetail() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { authed } = useAuth();
  const program = useProgram();

  const [listing, setListing] = useState<Listing | null | undefined>(undefined);
  const [reserving, setReserving] = useState(false);
  const [step, setStep] = useState("");
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchListing(id)
      .then(setListing)
      .catch(() => setListing(null));
  }, [id]);

  if (!id) return <NotFound />;
  if (listing === undefined) return <DetailSkeleton />;
  if (listing === null) return <NotFound />;

  const isSeller = publicKey?.toBase58() === listing.seller_wallet;
  const isActive = listing.status === "Active";

  async function reserve() {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    if (!program || !listing) return;
    if (!authed) {
      toastError("Approve the wallet sign-in to continue");
      return;
    }
    setReserving(true);
    try {
      const newCode = generateCode();
      const codeHash = await sha256Bytes(newCode);

      setStep("Locking USDC in escrow...");
      await sendReserve(
        program,
        publicKey,
        new BN(listing.onchain_item_id),
        codeHash
      );

      setStep("Confirming reservation...");
      await reserveListing(listing.id, newCode);

      setCode(newCode);
    } catch (err) {
      console.error(err);
      toastError(err instanceof Error ? err.message : "Reservation failed");
    } finally {
      setReserving(false);
      setStep("");
    }
  }

  if (code) {
    return (
      <div className="mx-auto max-w-md pop-in">
        <div className="glass-strong rounded-[var(--radius-card)] p-7 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl glass-purple text-3xl">
            🔒
          </div>
          <h1 className="text-xl font-extrabold">Reserved!</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Show this code to the seller when you meet up to receive your item.
          </p>
          <div className="purple-grad my-6 rounded-2xl py-6 text-5xl font-black tracking-[0.3em] text-white">
            {code}
          </div>
          <p className="text-xs text-[var(--color-ink-soft)]">
            You can find this code again any time under{" "}
            <strong>My Activity - Purchases</strong>.
          </p>
          <Button
            className="mt-6 w-full"
            onClick={() => router.push("/activity")}
          >
            Go to My Activity
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
      >
        Back
      </button>

      <Carousel photos={listing.photo_urls} fallbackCategory={listing.category} />

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <span className="silver mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold">
            {CATEGORY_EMOJI[listing.category]} {listing.category}
          </span>
          <h1 className="text-2xl font-extrabold">{listing.title}</h1>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-black text-[var(--color-purple-700)]">
            {formatUsdc(listing.price_usdc)}
          </p>
        </div>
      </div>

      {listing.description && (
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
          {listing.description}
        </p>
      )}

      <div className="glass mt-5 flex items-center gap-3 rounded-2xl p-3">
        <Identicon value={listing.seller_wallet} size={40} />
        <div>
          <p className="text-xs text-[var(--color-ink-soft)]">Seller</p>
          <p className="font-mono text-sm font-semibold">
            {shortenWallet(listing.seller_wallet)}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {isSeller ? (
          <div className="glass rounded-2xl p-4 text-center text-sm text-[var(--color-ink-soft)]">
            This is your listing.
          </div>
        ) : !isActive ? (
          <div className="glass rounded-2xl p-4 text-center text-sm font-semibold text-[var(--color-ink-soft)]">
            This item is {listing.status.toLowerCase()}.
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full"
            loading={reserving}
            onClick={reserve}
          >
            {reserving
              ? step || "Reserving..."
              : `Reserve · ${formatUsdc(listing.price_usdc)}`}
          </Button>
        )}
        <p className="mt-3 text-center text-xs text-[var(--color-ink-soft)]">
          Your USDC is held in on-chain escrow until you meet up and the handoff
          code is scanned.
        </p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="glass mx-auto mt-10 max-w-md rounded-[var(--radius-card)] p-10 text-center">
      <p className="text-lg font-semibold">Listing not found</p>
    </div>
  );
}
