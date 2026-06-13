"use client";

import { useState } from "react";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { Identicon } from "@/components/ui/Identicon";
import { insertRating } from "@/lib/data";
import { shortenWallet } from "@/lib/format";
import { toastError, toastSuccess } from "@/lib/toast";

export function RatingModal({
  raterWallet,
  rateeWallet,
  listingId,
  roleLabel,
  onDone,
}: {
  raterWallet: string;
  rateeWallet: string;
  listingId: string;
  roleLabel: string; // "seller" | "buyer"
  onDone: () => void;
}) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await insertRating({
        rater_wallet: raterWallet,
        ratee_wallet: rateeWallet,
        listing_id: listingId,
        stars,
        comment: comment.trim(),
      });
      toastSuccess("Thanks for your rating!");
      onDone();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't save rating");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="glass-strong w-full max-w-sm rounded-t-3xl p-6 text-center pop-in sm:rounded-3xl">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl glass-purple text-3xl">
          🎉
        </div>
        <h2 className="text-xl font-extrabold">Trade complete!</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          How was your {roleLabel}?
        </p>

        <div className="my-4 flex items-center justify-center gap-2">
          <Identicon value={rateeWallet} size={28} />
          <span className="font-mono text-sm">{shortenWallet(rateeWallet)}</span>
        </div>

        <div className="mb-4 flex justify-center">
          <StarRating value={stars} onChange={setStars} size={34} />
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment (optional)"
          rows={2}
          maxLength={240}
          className="w-full resize-none rounded-2xl border border-[var(--color-line)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--color-purple-400)]"
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={onDone}
            className="glass h-11 flex-1 rounded-full font-semibold"
          >
            Skip
          </button>
          <Button className="flex-1" loading={saving} onClick={submit}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
