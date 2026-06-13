"use client";

const STEPS = [
  {
    icon: "🔒",
    title: "Reserve",
    body: "Found something nearby? Reserve it — your USDC is locked safely in on-chain escrow, not sent to a stranger.",
  },
  {
    icon: "🤝",
    title: "Meet up",
    body: "Meet the seller at a public spot. Inspect the item in person. Your money stays protected until you're happy.",
  },
  {
    icon: "📷",
    title: "Scan & done",
    body: "Show your handoff QR code. The seller scans it to release the funds — minus a tiny 1.5% fee. Trade complete!",
  },
];

export function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-md rounded-t-3xl p-6 pop-in sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xl font-bold">How Resol works</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-lg text-[var(--color-ink-soft)] hover:bg-black/5"
          >
            ✕
          </button>
        </div>
        <p className="mb-5 text-sm text-[var(--color-ink-soft)]">
          Secure, local, secondhand trading in three steps.
        </p>
        <div className="space-y-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="glass flex items-start gap-4 rounded-2xl p-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl glass-purple text-2xl">
                {s.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--color-purple-600)]">
                    STEP {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-[var(--color-ink-soft)]">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
