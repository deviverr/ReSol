"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Button } from "@/components/ui/Button";
import { useProgram } from "@/lib/hooks/useProgram";
import { useAuth } from "@/components/providers/AuthProvider";
import { sendCreateListing } from "@/lib/anchor/program";
import { insertListing, uploadPhotos } from "@/lib/data";
import { generateItemId } from "@/lib/crypto";
import { getCurrentPosition } from "@/lib/geo";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/constants";
import { toastError, toastSuccess } from "@/lib/toast";

export default function SellPage() {
  return (
    <ConnectGate
      title="Sign in to sell"
      subtitle="Connect your wallet to list an item for sale."
    >
      <SellForm />
    </ConnectGate>
  );
}

function SellForm() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { authed } = useAuth();
  const program = useProgram();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState("");

  const previews = files.map((f) => URL.createObjectURL(f));

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, 4));
    e.target.value = "";
  }

  async function useMyLocation() {
    setLocating(true);
    try {
      setCoords(await getCurrentPosition());
      toastSuccess("Location captured");
    } catch {
      toastError("Couldn't get your location");
    } finally {
      setLocating(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!program || !publicKey) return;
    const priceNum = parseFloat(price);
    if (!title.trim() || !priceNum || priceNum <= 0) {
      toastError("Add a title and a price greater than 0");
      return;
    }
    if (!authed) {
      toastError("Approve the wallet sign-in to continue");
      return;
    }
    setSubmitting(true);
    try {
      setStep("Uploading photos…");
      const photoUrls = files.length
        ? await uploadPhotos(publicKey.toBase58(), files)
        : [];

      const itemId = generateItemId();
      setStep("Creating listing on-chain…");
      await sendCreateListing(program, publicKey, new BN(itemId), priceNum);

      setStep("Saving listing…");
      const listing = await insertListing({
        onchain_item_id: itemId,
        seller_wallet: publicKey.toBase58(),
        title: title.trim(),
        description: description.trim(),
        price_usdc: priceNum,
        category,
        photo_urls: photoUrls,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });

      toastSuccess("Listed! 🎉");
      router.push(`/listing/${listing.id}`);
    } catch (err) {
      console.error(err);
      toastError(
        err instanceof Error ? err.message : "Failed to create listing"
      );
    } finally {
      setSubmitting(false);
      setStep("");
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-extrabold">List an item</h1>
      <p className="mb-6 text-sm text-[var(--color-ink-soft)]">
        Sell something to a neighbor — paid in USDC, protected by escrow.
      </p>

      <div className="glass space-y-5 rounded-[var(--radius-card)] p-5">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Vintage film camera"
            className={inputCls}
            maxLength={80}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Condition, details, why you're selling…"
            rows={3}
            className={inputCls + " resize-none"}
            maxLength={600}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USDC)">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0.00"
              className={inputCls}
            />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_EMOJI[c]} {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={`Photos (${files.length}/4)`}>
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative h-20 w-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-full w-full rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--color-danger)] text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            {files.length < 4 && (
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-[var(--color-purple-200)] text-2xl text-[var(--color-purple-400)] hover:bg-[var(--color-purple-50)]">
                +
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onPickFiles}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </Field>

        <Field label="Location">
          <button
            type="button"
            onClick={useMyLocation}
            className={`silver inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${
              coords ? "text-[var(--color-success)]" : ""
            }`}
          >
            📍 {coords ? "Location set" : locating ? "Locating…" : "Use my location"}
          </button>
        </Field>
      </div>

      <Button
        type="submit"
        size="lg"
        loading={submitting}
        className="mt-6 w-full"
      >
        {submitting ? step || "Listing…" : "Post listing"}
      </Button>
    </form>
  );
}

const inputCls =
  "w-full rounded-2xl border border-[var(--color-line)] bg-white/70 px-4 py-3 text-[15px] outline-none transition focus:border-[var(--color-purple-400)] focus:ring-2 focus:ring-[var(--color-purple-200)]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[var(--color-ink)]">
        {label}
      </span>
      {children}
    </label>
  );
}
