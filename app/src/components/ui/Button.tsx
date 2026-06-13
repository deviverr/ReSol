"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "glass" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none";

const variants: Record<Variant, string> = {
  primary: "purple-grad text-white purple-glow hover:brightness-110",
  glass: "glass-strong text-[var(--color-ink)] hover:bg-white/90",
  ghost: "text-[var(--color-purple-600)] hover:bg-[var(--color-purple-50)]",
  danger: "bg-[var(--color-danger)] text-white hover:brightness-110",
};

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base py-3.5",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof sizes;
  loading?: boolean;
}) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
