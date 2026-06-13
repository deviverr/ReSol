"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Button, Spinner } from "@/components/ui/Button";
import { HandoffQR } from "@/components/activity/HandoffQR";
import { QRScanner } from "@/components/activity/QRScanner";
import { RatingModal } from "@/components/activity/RatingModal";
import { CATEGORY_EMOJI } from "@/lib/constants";
import { formatUsdc, timeAgo } from "@/lib/format";
import { toastError, toastSuccess } from "@/lib/toast";
import { useProgram } from "@/lib/hooks/useProgram";
import {
  fetchMyListings,
  fetchMyPurchases,
  fetchRatedListingIds,
  cancelReservation,
  completeListing,
} from "@/lib/data";
import {
  sendCancel,
  sendAutoRefund,
  sendRelease,
  fetchOnchainListing,
} from "@/lib/anchor/program";
import type { Listing, Escrow } from "@/lib/types";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

type Purchase = Escrow & { listing: Listing };

export default function ActivityPage() {
  return (
    <ConnectGate
      title="Your activity"
      subtitle="Connect your wallet to see your listings and purchases."
    >
      <Activity />
    </ConnectGate>
  );
}

function Activity() {
  const { publicKey } = useWallet();
  const program = useProgram();
  const wallet = publicKey?.toBase58() ?? "";

  const [tab, setTab] = useState<"purchases" | "listings">("purchases");
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [rated, setRated] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [qr, setQr] = useState<{ id: string; code: string; title: string } | null>(null);
  const [scanFor, setScanFor] = useState<Listing | null>(null);
  const [rating, setRating] = useState<{
    ratee: string;
    listingId: string;
    role: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!wallet) return;
    const [l, p, r] = await Promise.all([
      fetchMyListings(wallet),
      fetchMyPurchases(),
      fetchRatedListingIds(wallet),
    ]);
    setListings(l);
    setPurchases(p);
    setRated(r);
    setNow(Date.now());
  }, [wallet]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        load().catch((e) => toastError(e.message ?? "Failed to load activity"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function cancel(p: Purchase) {
    if (!program || !publicKey) return;
    setBusy(p.id);
    try {
      await sendCancel(program, publicKey, new BN(p.listing.onchain_item_id));
      await cancelReservation(p.listing_id);
      toastSuccess("Reservation cancelled — you've been refunded");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(null);
    }
  }

  async function claimRefund(p: Purchase) {
    if (!program || !publicKey) return;
    setBusy(p.id);
    try {
      await sendAutoRefund(
        program,
        publicKey,
        new BN(p.listing.onchain_item_id),
        publicKey
      );
      await cancelReservation(p.listing_id);
      toastSuccess("Refund claimed");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setBusy(null);
    }
  }

  async function onScanned(data: { listing_id: string; release_code: string }) {
    const listing = scanFor;
    setScanFor(null);
    if (!program || !publicKey || !listing) return;
    if (data.listing_id !== listing.id) {
      toastError("That code is for a different item");
      return;
    }
    setBusy(listing.id);
    try {
      const onchain = await fetchOnchainListing(
        program,
        new BN(listing.onchain_item_id)
      );
      const buyer = onchain.buyer as PublicKey;
      await sendRelease(
        program,
        publicKey,
        new BN(listing.onchain_item_id),
        data.release_code,
        publicKey,
        buyer
      );
      await completeListing(listing.id);
      toastSuccess("Funds released — trade complete!");
      await load();
      setRating({
        ratee: buyer.toBase58(),
        listingId: listing.id,
        role: "buyer",
      });
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Release failed");
    } finally {
      setBusy(null);
    }
  }

  async function rateBuyer(listing: Listing) {
    if (!program) return;
    try {
      const onchain = await fetchOnchainListing(
        program,
        new BN(listing.onchain_item_id)
      );
      setRating({
        ratee: (onchain.buyer as PublicKey).toBase58(),
        listingId: listing.id,
        role: "buyer",
      });
    } catch {
      toastError("Couldn't load the buyer to rate");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-extrabold">My Activity</h1>

      <div className="glass mb-5 inline-flex rounded-full p-1">
        <TabBtn active={tab === "purchases"} onClick={() => setTab("purchases")}>
          My Purchases
        </TabBtn>
        <TabBtn active={tab === "listings"} onClick={() => setTab("listings")}>
          My Listings
        </TabBtn>
      </div>

      {tab === "purchases" ? (
        purchases === null ? (
          <Loading />
        ) : purchases.length === 0 ? (
          <Empty label="You haven't reserved anything yet." />
        ) : (
          <div className="space-y-3">
            {purchases.map((p) => {
              const stale =
                p.status === "Reserved" &&
                now - new Date(p.reserved_at).getTime() > SEVEN_DAYS;
              const sold = p.listing.status === "Sold";
              return (
                <Row key={p.id} listing={p.listing}>
                  {p.status === "Reserved" && p.listing.status === "Reserved" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          setQr({
                            id: p.listing_id,
                            code: p.release_code,
                            title: p.listing.title,
                          })
                        }
                      >
                        Show Handoff Code
                      </Button>
                      <Button
                        size="sm"
                        variant="glass"
                        loading={busy === p.id}
                        onClick={() => cancel(p)}
                      >
                        Cancel
                      </Button>
                      {stale && (
                        <Button
                          size="sm"
                          variant="danger"
                          loading={busy === p.id}
                          onClick={() => claimRefund(p)}
                        >
                          Claim Refund
                        </Button>
                      )}
                    </>
                  )}
                  {sold && !rated.has(p.listing_id) && (
                    <Button
                      size="sm"
                      variant="glass"
                      onClick={() =>
                        setRating({
                          ratee: p.listing.seller_wallet,
                          listingId: p.listing_id,
                          role: "seller",
                        })
                      }
                    >
                      ⭐ Rate seller
                    </Button>
                  )}
                  {sold && rated.has(p.listing_id) && <SoldBadge />}
                </Row>
              );
            })}
          </div>
        )
      ) : listings === null ? (
        <Loading />
      ) : listings.length === 0 ? (
        <Empty label="You haven't listed anything yet." cta />
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <Row key={l.id} listing={l}>
              {l.status === "Active" && <StatusPill status="Active" />}
              {l.status === "Reserved" && (
                <>
                  <StatusPill status="Reserved" />
                  <Button
                    size="sm"
                    loading={busy === l.id}
                    onClick={() => setScanFor(l)}
                  >
                    📷 Complete Handoff
                  </Button>
                </>
              )}
              {l.status === "Sold" && !rated.has(l.id) && (
                <Button size="sm" variant="glass" onClick={() => rateBuyer(l)}>
                  ⭐ Rate buyer
                </Button>
              )}
              {l.status === "Sold" && rated.has(l.id) && <SoldBadge />}
            </Row>
          ))}
        </div>
      )}

      {qr && (
        <HandoffQR
          listingId={qr.id}
          releaseCode={qr.code}
          title={qr.title}
          onClose={() => setQr(null)}
        />
      )}
      {scanFor && (
        <QRScanner onScan={onScanned} onClose={() => setScanFor(null)} />
      )}
      {rating && (
        <RatingModal
          raterWallet={wallet}
          rateeWallet={rating.ratee}
          listingId={rating.listingId}
          roleLabel={rating.role}
          onDone={() => {
            setRating(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function Row({
  listing,
  children,
}: {
  listing: Listing;
  children: React.ReactNode;
}) {
  const photo = listing.photo_urls?.[0];
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3">
      <Link
        href={{ pathname: "/listing", query: { id: listing.id } }}
        className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--color-purple-50)] text-2xl"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          CATEGORY_EMOJI[listing.category] ?? "✨"
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{listing.title}</p>
        <p className="text-sm font-bold text-[var(--color-purple-700)]">
          {formatUsdc(listing.price_usdc)}
        </p>
        <p className="text-xs text-[var(--color-ink-soft)]">
          {timeAgo(listing.created_at)}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "purple-grad text-white" : "text-[var(--color-ink-soft)]"
      }`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "Active"
      ? "text-[var(--color-success)]"
      : status === "Reserved"
        ? "text-[var(--color-warning)]"
        : "text-[var(--color-ink-soft)]";
  return <span className={`silver rounded-full px-3 py-1.5 text-xs font-bold ${color}`}>{status}</span>;
}

function SoldBadge() {
  return (
    <span className="silver rounded-full px-3 py-1.5 text-xs font-bold text-[var(--color-success)]">
      ✓ Sold & rated
    </span>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-16 text-[var(--color-purple-500)]">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

function Empty({ label, cta }: { label: string; cta?: boolean }) {
  return (
    <div className="glass flex flex-col items-center rounded-[var(--radius-card)] px-6 py-14 text-center">
      <div className="mb-3 text-4xl">📭</div>
      <p className="text-sm text-[var(--color-ink-soft)]">{label}</p>
      {cta && (
        <Link href="/sell" className="mt-4">
          <Button size="sm">List an item</Button>
        </Link>
      )}
    </div>
  );
}
