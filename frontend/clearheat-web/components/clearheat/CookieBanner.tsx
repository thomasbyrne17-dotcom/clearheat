"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";

const CONSENT_KEY = "ch_cookie_consent";
const GA_ID = "G-WX650QLEBG";

export default function CookieBanner() {
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted" || stored === "declined") {
      setConsent(stored as "accepted" | "declined");
    } else {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setConsent("accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setConsent("declined");
    setVisible(false);
  };

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          />
          <Script
            id="ga-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `,
            }}
          />
        </>
      )}

      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
          <div className="mx-auto max-w-3xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-sm text-muted-foreground flex-1">
              We use analytics cookies to understand how the calculator is used and to improve the tool.
              No personal data is collected without your explicit consent.{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy policy
              </Link>
              .
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={decline}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={accept}
                className="px-4 py-2 text-sm bg-foreground text-background rounded-md hover:opacity-90 transition-opacity"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
