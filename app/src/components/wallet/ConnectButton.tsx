"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Identicon } from "@/components/ui/Identicon";
import { Spinner } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { shortenWallet } from "@/lib/format";

export function ConnectButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { signingIn } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="purple-grad purple-glow inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-95"
      >
        {connecting ? <Spinner /> : <WalletIcon />}
        Connect Wallet
      </button>
    );
  }

  const addr = publicKey.toBase58();
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass-strong inline-flex h-10 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-sm font-semibold transition hover:bg-white/90 active:scale-95"
      >
        <Identicon value={addr} size={28} />
        <span className="font-mono">{shortenWallet(addr)}</span>
        {signingIn && <Spinner className="h-3 w-3" />}
      </button>
      {open && (
        <div className="glass-strong absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl p-1.5 pop-in">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(addr);
              setOpen(false);
            }}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--color-purple-50)]"
          >
            Copy address
          </button>
          <button
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--color-danger)] hover:bg-red-50"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M16 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 9h13a2 2 0 012 2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
