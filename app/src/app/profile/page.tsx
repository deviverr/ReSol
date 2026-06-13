"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Identicon } from "@/components/ui/Identicon";
import { Button } from "@/components/ui/Button";
import { RatingBadge } from "@/components/ui/StarRating";
import { ListingCard } from "@/components/listing/ListingCard";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  fetchProfile,
  upsertProfile,
  fetchRatingSummary,
  fetchMyListings,
} from "@/lib/data";
import { shortenWallet } from "@/lib/format";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Listing } from "@/lib/types";

export default function ProfilePage() {
  return (
    <ConnectGate
      title="Your profile"
      subtitle="Connect your wallet to view your profile."
    >
      <Profile />
    </ConnectGate>
  );
}

function Profile() {
  const { publicKey } = useWallet();
  const { authed } = useAuth();
  const wallet = publicKey!.toBase58();

  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<{ avg: number | null; count: number }>({
    avg: null,
    count: 0,
  });
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    fetchProfile(wallet).then((p) => setName(p?.display_name ?? ""));
    fetchRatingSummary(wallet).then(setSummary).catch(() => {});
    fetchMyListings(wallet)
      .then((l) => setListings(l.filter((x) => x.status === "Active")))
      .catch(() => {});
  }, [wallet]);

  async function save() {
    if (!authed) {
      toastError("Approve the wallet sign-in to edit your profile");
      return;
    }
    setSaving(true);
    try {
      await upsertProfile(wallet, name.trim());
      toastSuccess("Profile saved");
      setEditing(false);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="glass-strong flex flex-col items-center rounded-[var(--radius-card)] p-7 text-center">
        <Identicon value={wallet} size={88} />
        <div className="mt-4 w-full max-w-xs">
          {editing ? (
            <div className="flex flex-col items-center gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                maxLength={40}
                className="w-full rounded-2xl border border-[var(--color-line)] bg-white/70 px-4 py-2.5 text-center text-lg font-bold outline-none focus:border-[var(--color-purple-400)]"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="glass" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" loading={saving} onClick={save}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-2xl font-extrabold">
                {name || "Unnamed trader"}
              </h1>
              <button
                onClick={() => setEditing(true)}
                className="text-sm font-semibold text-[var(--color-purple-600)] hover:underline"
              >
                Edit name
              </button>
            </div>
          )}
        </div>

        <p className="mt-3 font-mono text-sm text-[var(--color-ink-soft)]">
          {shortenWallet(wallet, 6, 6)}
        </p>
        <div className="mt-3">
          <RatingBadge avg={summary.avg} count={summary.count} />
        </div>
      </div>

      <h2 className="mb-3 mt-7 text-lg font-bold">
        Active listings ({listings.length})
      </h2>
      {listings.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-10 text-center text-sm text-[var(--color-ink-soft)]">
          No active listings.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} distanceKm={null} />
          ))}
        </div>
      )}
    </div>
  );
}
