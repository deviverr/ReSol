export type ToastType = "success" | "error" | "info";
export interface ToastEvent {
  id: number;
  message: string;
  type: ToastType;
}

let counter = 0;

export function toast(message: string, type: ToastType = "info") {
  if (typeof window === "undefined") return;
  const detail: ToastEvent = { id: ++counter, message, type };
  window.dispatchEvent(new CustomEvent("resol-toast", { detail }));
}

export const toastSuccess = (m: string) => toast(m, "success");
export const toastError = (m: string) => toast(m, "error");
