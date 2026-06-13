"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/Button";

export function ConnectGate({
  children,
  title = "Connect your wallet",
  subtitle = "Connect a Solana wallet to continue.",
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  if (publicKey) return <>{children}</>;

  return (
    <div className="glass mx-auto mt-10 flex max-w-md flex-col items-center rounded-[var(--radius-card)] px-6 py-14 text-center">
      <div className="mb-4 grid h-20 w-20 place-items-center rounded-3xl glass-purple text-4xl">
        🔐
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mb-5 mt-1 text-sm text-[var(--color-ink-soft)]">{subtitle}</p>
      <Button onClick={() => setVisible(true)}>Connect Wallet</Button>
    </div>
  );
}
