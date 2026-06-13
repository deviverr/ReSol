"use client";

import { useState } from "react";

export function StarRating({
  value,
  onChange,
  size = 28,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n)}
          className={readOnly ? "cursor-default" : "cursor-pointer"}
          style={{ lineHeight: 0 }}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path
              d="M12 2l2.9 6.2 6.8.9-5 4.7 1.3 6.8L12 17.5 5.9 20.6 7.2 13.8l-5-4.7 6.8-.9z"
              fill={n <= shown ? "#f5a524" : "none"}
              stroke={n <= shown ? "#f5a524" : "#cdb8fc"}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function RatingBadge({
  avg,
  count,
}: {
  avg: number | null;
  count: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-soft)]">
      <span style={{ color: "#f5a524" }}>★</span>
      {avg != null ? (
        <>
          <span className="font-semibold text-[var(--color-ink)]">
            {avg.toFixed(1)}
          </span>
          <span>({count})</span>
        </>
      ) : (
        <span>No ratings yet</span>
      )}
    </span>
  );
}
