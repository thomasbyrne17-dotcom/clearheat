"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export default function CalculatorStartedTracker() {
  useEffect(() => {
    window.gtag?.("event", "calculator_started", {
      page_path: "/calculator",
    });
  }, []);

  return null;
}
