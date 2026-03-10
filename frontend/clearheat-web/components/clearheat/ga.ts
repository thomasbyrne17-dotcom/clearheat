"use client";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function gaEvent(name: string, params: Record<string, any> = {}) {
  // Safe no-op if GA isn't ready (ad blockers, slow load, etc.)
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}
