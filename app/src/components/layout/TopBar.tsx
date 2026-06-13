"use client";

import Link from "next/link";
import { useState } from "react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { HowItWorksModal } from "./HowItWorksModal";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function TopBar() {
  const [showHow, setShowHow] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="glass mx-auto flex max-w-6xl items-center justify-between rounded-full px-3 py-2 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-extrabold tracking-tight">Resol</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHow(true)}
              className="hidden h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-[var(--color-ink-soft)] transition hover:bg-white/60 sm:inline-flex"
            >
              <span className="text-base">💡</span> How it works
            </button>
            <button
              onClick={() => setShowHow(true)}
              className="grid h-10 w-10 place-items-center rounded-full text-lg transition hover:bg-white/60 sm:hidden"
              aria-label="How it works"
            >
              💡
            </button>
            <ConnectButton />
          </div>
        </div>
      </header>
      {showHow && <HowItWorksModal onClose={() => setShowHow(false)} />}
    </>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span
      className="purple-glow block overflow-hidden rounded-[10px]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${basePath}/resol-icon.png`}
        alt=""
        className="h-full w-full object-cover"
        draggable={false}
      />
    </span>
  );
}
