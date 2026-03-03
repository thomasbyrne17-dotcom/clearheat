"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function gaEvent(name: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}

type PreviewData = {
  reportId: string;
  verdictClass?: string | null;
  headline?: string;
  confidence?: string;
  context?: string;
  grossQuoteEur?: number | null; // hp_quote_eur
  netCapexEur?: number | null;   // hp_capex_eur (after grant)
};

function formatEUR(n: number) {
  return n.toLocaleString("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function VerdictBadge({ verdictClass }: { verdictClass?: string | null }) {
  const label =
    verdictClass === "likely_saves"
      ? "Likely to Save"
      : verdictClass === "unlikely_saves"
      ? "Unlikely to Save"
      : verdictClass === "borderline"
      ? "Borderline"
      : verdictClass
      ? String(verdictClass)
      : "Verdict";

  return (
    <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
      {label}
    </div>
  );
}

export default function ReportPreviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reportId = searchParams.get("reportId");

  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ctaLoading, setCtaLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const viewFiredRef = useRef(false);
  const successFiredRef = useRef(false);
  const cancelFiredRef = useRef(false);

  const isPaidReturn = success && !!sessionId;

  // Persist session id per report so refresh still allows download
  useEffect(() => {
    if (isPaidReturn && reportId && sessionId) {
      localStorage.setItem(`ch_paid_session_${reportId}`, sessionId);
    }
  }, [isPaidReturn, reportId, sessionId]);

  const storedSessionId = useMemo(() => {
    if (typeof window === "undefined" || !reportId) return null;
    return localStorage.getItem(`ch_paid_session_${reportId}`);
  }, [reportId]);

  const effectiveSessionId = sessionId || storedSessionId;

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      setError("Missing reportId");
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/report-preview?reportId=${encodeURIComponent(reportId)}`,
          { method: "GET" }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to load preview");
        }

        const json = (await res.json()) as PreviewData;
        setData(json);

        if (!viewFiredRef.current) {
          viewFiredRef.current = true;
          gaEvent("interstitial_view", {
            page_path: "/report-preview",
            report_id: reportId,
            verdict_class: json.verdictClass ?? undefined,
          });
        }

        if (isPaidReturn && !successFiredRef.current) {
          successFiredRef.current = true;
          gaEvent("stripe_return_success", {
            page_path: "/report-preview",
            report_id: reportId,
            session_id: sessionId,
          });
        }

        if (canceled && !cancelFiredRef.current) {
          cancelFiredRef.current = true;
          gaEvent("stripe_return_canceled", {
            page_path: "/report-preview",
            report_id: reportId,
          });
        }
      } catch (e: any) {
        setError(e?.message ?? "Error loading preview");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [reportId, isPaidReturn, canceled, sessionId]);

  const onUnlockClick = async () => {
    if (!reportId || !data || ctaLoading) return;

    gaEvent("interstitial_cta_click", {
      page_path: "/report-preview",
      report_id: reportId,
      verdict_class: data.verdictClass ?? undefined,
    });

    try {
      setCtaLoading(true);

      const r = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });

      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || "Failed to start checkout");
      }

      const out = await r.json();
      const url = out?.url;
      if (!url) throw new Error("Stripe checkout URL missing");

      window.location.href = url;
    } catch (e: any) {
      const msg = e?.message ?? "Error starting checkout";
      setError(msg);

      gaEvent("interstitial_cta_error", {
        page_path: "/report-preview",
        report_id: reportId,
        error_message: String(msg).slice(0, 120),
      });
    } finally {
      setCtaLoading(false);
    }
  };

  const onDownloadClick = async () => {
    if (!reportId || !effectiveSessionId || downloadLoading) return;

    gaEvent("report_download_click", {
      page_path: "/report-preview",
      report_id: reportId,
    });

    try {
      setDownloadLoading(true);

      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: effectiveSessionId,
          reportId,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "PDF download failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clearheat_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      gaEvent("report_download_success", {
        page_path: "/report-preview",
        report_id: reportId,
      });

      router.replace(`/report-preview?reportId=${encodeURIComponent(reportId)}`);
    } catch (e: any) {
      const msg = e?.message ?? "Error downloading PDF";
      setError(msg);

      gaEvent("report_download_error", {
        page_path: "/report-preview",
        report_id: reportId,
        error_message: String(msg).slice(0, 120),
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  const verdictHeadline = data?.headline ?? "Your Heat Pump Financial Verdict";
  const confidence = data?.confidence ?? "";
  const context =
    data?.context ||
    "This outcome can be sensitive to system design and achievable flow temperature.";

  const gross =
    typeof data?.grossQuoteEur === "number" ? data.grossQuoteEur : null;
  const net = typeof data?.netCapexEur === "number" ? data.netCapexEur : null;

  const grossText = gross ? formatEUR(gross) : null;
  const netText = net ? formatEUR(net) : null;

  const topHeadline = grossText
    ? `Before You Commit ${grossText}, Review Your Personalised Financial Outcome.`
    : "Your Personalised Heat Pump Financial Assessment";

  const priceAnchor = netText ?? grossText ?? null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="text-sm text-muted-foreground">Report Preview</div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold leading-tight">{topHeadline}</h1>
            <p className="text-muted-foreground">
              Based on your home, fuel usage and grant assumptions, a structured
              20-year financial screening model has been completed.
            </p>
          </div>

          <div className="pt-1">
            <VerdictBadge verdictClass={data?.verdictClass ?? null} />
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {loading && <div className="text-sm">Loading…</div>}

          {!loading && error && (
            <div className="space-y-3">
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
              <Button variant="secondary" onClick={() => router.push("/calculator")}>
                Back to Calculator
              </Button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Finding */}
              <section className="rounded-xl border p-6">
                <div className="space-y-3">
                  <div className="text-xs font-medium tracking-wide text-muted-foreground">
                    FINDING
                  </div>

                  <div className="text-2xl font-semibold">{verdictHeadline}</div>

                  {confidence && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Confidence: </span>
                      {confidence}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">{context}</p>

                  {canceled && (
                    <div className="pt-2 text-sm">
                      Checkout canceled. You can unlock the full report anytime.
                    </div>
                  )}

                  {isPaidReturn && (
                    <div className="pt-2 text-sm">
                      Payment confirmed. Download your report below.
                    </div>
                  )}
                </div>
              </section>

              {/* What’s inside */}
              <section className="space-y-3">
                <div className="text-sm font-medium">What’s inside the full report</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    "20-year cost comparison vs your current fuel",
                    "Grant-adjusted payback timeline",
                    "Sensitivity analysis (electricity price ±15%)",
                    "Fuel & electricity price escalation assumptions",
                    "Risk assessment summary (what can flip the outcome)",
                    "Assumptions and methodology transparency",
                  ].map((t) => (
                    <div key={t} className="rounded-lg border p-3 text-sm">
                      {t}
                    </div>
                  ))}
                </div>
              </section>

              {/* Authority + risk reversal */}
              <section className="rounded-xl border p-6 space-y-3">
                <div className="text-sm text-muted-foreground">
                  Built using engineering-grade energy modelling assumptions
                  specific to Irish housing and SEAI grant structures.
                </div>
                <div className="text-sm text-muted-foreground">
                  If your report isn’t useful, email within 7 days for a full refund.
                </div>
              </section>

              {/* Price anchor */}
              <section className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">
                  The full report is available for €29.
                </div>
                <div className="text-sm text-muted-foreground">
                  €29 to evaluate a {priceAnchor ?? "major"} decision.
                </div>
              </section>

              {/* CTA */}
              <section className="space-y-3 pt-2">
                {effectiveSessionId ? (
                  <Button
                    className="w-full"
                    onClick={onDownloadClick}
                    disabled={downloadLoading || ctaLoading}
                  >
                    {downloadLoading ? "Downloading…" : "Download Report"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={onUnlockClick}
                    disabled={ctaLoading}
                  >
                    {ctaLoading ? "Redirecting…" : "Unlock My Full Financial Verdict — €29"}
                  </Button>
                )}

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.push("/calculator")}
                  disabled={ctaLoading || downloadLoading}
                >
                  Back
                </Button>
              </section>

              {/* Footer note */}
              <section className="pt-2">
                <div className="text-xs text-muted-foreground">
                  Screening estimate only. Not a substitute for a detailed design
                  survey.
                </div>
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}