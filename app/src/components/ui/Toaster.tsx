"use client";

import { useEffect, useState } from "react";
import type { ToastEvent } from "@/lib/toast";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const t = (e as CustomEvent<ToastEvent>).detail;
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    };
    window.addEventListener("resol-toast", handler);
    return () => window.removeEventListener("resol-toast", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`glass-strong pop-in pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
            t.type === "error"
              ? "text-[var(--color-danger)]"
              : t.type === "success"
                ? "text-[var(--color-success)]"
                : "text-[var(--color-ink)]"
          }`}
        >
          <span>{t.type === "success" ? "✅" : t.type === "error" ? "⚠️" : "ℹ️"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
