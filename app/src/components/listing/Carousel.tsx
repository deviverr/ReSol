"use client";

import { useState } from "react";
import { CATEGORY_EMOJI } from "@/lib/constants";

export function Carousel({
  photos,
  fallbackCategory,
}: {
  photos: string[];
  fallbackCategory: string;
}) {
  const [i, setI] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-[var(--radius-card)] glass-purple text-7xl">
        {CATEGORY_EMOJI[fallbackCategory] ?? "✨"}
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-purple-50)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[i]}
        alt=""
        className="h-full w-full object-cover"
      />
      {photos.length > 1 && (
        <>
          <NavBtn side="left" onClick={() => setI((i - 1 + photos.length) % photos.length)} />
          <NavBtn side="right" onClick={() => setI((i + 1) % photos.length)} />
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((_, j) => (
              <span
                key={j}
                className={`h-1.5 rounded-full transition-all ${
                  j === i ? "w-5 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NavBtn({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`glass-strong absolute top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full ${
        side === "left" ? "left-3" : "right-3"
      }`}
      aria-label={side === "left" ? "Previous" : "Next"}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}
