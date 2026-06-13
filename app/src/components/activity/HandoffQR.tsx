"use client";

import { QRCodeSVG } from "qrcode.react";

export function HandoffQR({
  listingId,
  releaseCode,
  title,
  onClose,
}: {
  listingId: string;
  releaseCode: string;
  title: string;
  onClose: () => void;
}) {
  const payload = JSON.stringify({ listing_id: listingId, release_code: releaseCode });
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-sm rounded-t-3xl p-6 text-center pop-in sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">Handoff code</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Show this to the seller of <strong>{title}</strong> at your meetup.
        </p>
        <div className="mx-auto my-5 w-fit rounded-3xl bg-white p-5 shadow-inner">
          <QRCodeSVG value={payload} size={200} fgColor="#5730bf" level="M" />
        </div>
        <div className="purple-grad rounded-2xl py-3 text-3xl font-black tracking-[0.3em] text-white">
          {releaseCode}
        </div>
        <button
          onClick={onClose}
          className="glass mt-5 h-11 w-full rounded-full font-semibold"
        >
          Done
        </button>
      </div>
    </div>
  );
}
