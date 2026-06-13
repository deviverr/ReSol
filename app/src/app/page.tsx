"use client";

import { useEffect, useMemo, useState } from "react";
import { ListingCard } from "@/components/listing/ListingCard";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { fetchActiveListings } from "@/lib/data";
import { haversineKm, getCurrentPosition, type Coords } from "@/lib/geo";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/constants";
import type { Listing } from "@/lib/types";
import { Logo } from "@/components/layout/TopBar";

export default function BrowsePage() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveListings()
      .then(setListings)
      .catch((e) => {
        setError(e.message ?? "Failed to load listings");
        setListings([]);
      });
    getCurrentPosition()
      .then(setCoords)
      .catch(() => {});
  }, []);

  const withDistance = useMemo(() => {
    if (!listings) return [];
    const rows = listings
      .filter((l) => !category || l.category === category)
      .map((l) => ({
        listing: l,
        distanceKm:
          coords && l.lat != null && l.lng != null
            ? haversineKm(coords.lat, coords.lng, l.lat, l.lng)
            : null,
      }));
    rows.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
    return rows;
  }, [listings, coords, category]);

  return (
    <div>
      {/* Hero / landing header */}
      <section className="glass-purple mb-6 overflow-hidden rounded-[var(--radius-card)] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
              Resol
            </h1>
            <p className="text-sm font-medium text-[var(--color-purple-700)]">
              Secure, local, secondhand trading.
            </p>
          </div>
        </div>
        <p className="mt-3 max-w-lg text-sm text-[var(--color-ink-soft)]">
          Buy and sell with neighbors. Your USDC stays locked in on-chain escrow
          until you meet up and scan the handoff code — no scams, no chargebacks.
        </p>
      </section>

      {/* Category filter chips */}
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        <Chip active={category === null} onClick={() => setCategory(null)}>
          🌐 All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {CATEGORY_EMOJI[c]} {c}
          </Chip>
        ))}
      </div>

      {listings === null ? (
        <FeedSkeleton />
      ) : withDistance.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {withDistance.map(({ listing, distanceKm }) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              distanceKm={distanceKm}
            />
          ))}
        </div>
      )}
      {error && (
        <p className="mt-4 text-center text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

function Chip({
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
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "purple-grad text-white purple-glow"
          : "glass text-[var(--color-ink-soft)] hover:bg-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="glass mt-8 flex flex-col items-center rounded-[var(--radius-card)] px-6 py-16 text-center">
      <div className="mb-4 grid h-20 w-20 place-items-center rounded-3xl glass-purple text-4xl">
        🛍️
      </div>
      <h3 className="text-lg font-bold">No listings near you yet</h3>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        Be the first to post!
      </p>
    </div>
  );
}
