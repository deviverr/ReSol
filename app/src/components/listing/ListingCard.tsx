"use client";

import Link from "next/link";
import type { Listing } from "@/lib/types";
import { formatUsdc, formatDistance } from "@/lib/format";
import { CATEGORY_EMOJI } from "@/lib/constants";

export function ListingCard({
  listing,
  distanceKm,
}: {
  listing: Listing;
  distanceKm: number | null;
}) {
  const photo = listing.photo_urls?.[0];
  return (
    <Link
      href={{ pathname: "/listing", query: { id: listing.id } }}
      className="group glass block overflow-hidden rounded-[var(--radius-card)] p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[var(--color-purple-50)]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-4xl">
            {CATEGORY_EMOJI[listing.category] ?? "✨"}
          </div>
        )}
        <span className="silver absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold">
          {CATEGORY_EMOJI[listing.category]} {listing.category}
        </span>
      </div>
      <h3 className="mt-3 line-clamp-1 font-semibold">{listing.title}</h3>
      <p className="text-xs text-[var(--color-ink-soft)]">
        {formatDistance(distanceKm)}
      </p>
      <p className="mt-1.5 text-lg font-extrabold text-[var(--color-purple-700)]">
        {formatUsdc(listing.price_usdc)}
      </p>
    </Link>
  );
}
