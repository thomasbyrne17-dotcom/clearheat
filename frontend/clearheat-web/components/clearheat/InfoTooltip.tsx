"use client";

import { useState } from "react";

export default function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="More information"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>
      {open && (
        <span className="absolute z-10 mt-1 max-w-xs rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md translate-y-5">
          {text}
        </span>
      )}
    </span>
  );
}
