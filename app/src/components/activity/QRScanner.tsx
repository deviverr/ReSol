"use client";

import { useEffect, useRef, useState } from "react";

const REGION_ID = "resol-qr-region";

export function QRScanner({
  onScan,
  onClose,
}: {
  onScan: (data: { listing_id: string; release_code: string }) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const instance = new Html5Qrcode(REGION_ID);
        scanner = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          (decoded: string) => {
            if (stoppedRef.current) return;
            try {
              const parsed = JSON.parse(decoded);
              if (parsed.listing_id && parsed.release_code) {
                stoppedRef.current = true;
                instance.stop().then(() => onScan(parsed)).catch(() => onScan(parsed));
              }
            } catch {
              setError("That QR code isn't a Resol handoff code.");
            }
          },
          () => {}
        );
      } catch {
        setError(
          "Couldn't access the camera. Grant camera permission and try again."
        );
      }
    })();

    return () => {
      stoppedRef.current = true;
      if (scanner) {
        scanner.stop().then(() => scanner?.clear()).catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-sm rounded-t-3xl p-6 text-center pop-in sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">Scan buyer&apos;s code</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Point your camera at the buyer&apos;s handoff QR to release the funds.
        </p>
        <div
          id={REGION_ID}
          className="mx-auto my-5 aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl bg-black/80"
        />
        {error && (
          <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>
        )}
        <button
          onClick={onClose}
          className="glass h-11 w-full rounded-full font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
