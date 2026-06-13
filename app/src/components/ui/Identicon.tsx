"use client";

import { useMemo } from "react";
import { toSvg } from "jdenticon";

export function Identicon({
  value,
  size = 40,
  className = "",
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const svg = useMemo(() => toSvg(value || "resol", size), [value, size]);
  return (
    <span
      className={`inline-block overflow-hidden rounded-full silver ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
