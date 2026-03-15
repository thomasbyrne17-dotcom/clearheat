"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function gaEvent(name: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PreviewData = {
  reportId: string;
  verdictClass?: string | null;
  headline?: string;
  confidence?: string;
  context?: string;
  grossQuoteEur?: number | null;
  netCapexEur?: number | null;
};

type LeadForm = {
  name: string;
  email: string;
  phone: string;
  intent_timeline: string;
  consent_installer_contact: boolean;
};

type EmailForm = {
  email: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEUR(n: number) {
  return n.toLocaleString("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function VerdictBadge({ verdictClass }: { verdictClass?: string | null }) {
  const configs: Record<string, { label: string; className: string }> = {
    likely_saves: { label: "Likely to Save", className: "bg-green-50 text-green-800 border-green-200" },
    borderline: { label: "Borderline", className: "bg-yellow-50 text-yellow-800 border-yellow-200" },
    unlikely_saves: { label: "Unlikely to Save", className: "bg-red-50 text-red-800 border-red-200" },
  };
  const cfg = verdictClass ? configs[verdictClass] : null;
  return (
    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cfg?.className ?? "border-muted"}`}>
      {cfg?.label ?? "Verdict"}
    </div>
  );
}

function getCtaCopy(verdictClass?: string | null) {
  if (verdictClass === "likely_saves") {
    return {
      heading: "Your home looks like a good fit for a heat pump.",
      sub: "Get quotes from SEAI-registered installers in your area.",
      buttonLabel: "Request installer quotes",
    };
  }
  if (verdictClass === "borderline") {
    return {
      heading: "A professional home energy assessment is recommended.",
      sub: "An assessor can tell you what would need to change for a heat pump to make sense.",
      buttonLabel: "Connect with an energy assessor",
    };
  }
  if (verdictClass === "unlikely_saves") {
    return {
      heading: "Insulation upgrades may be needed first.",
      sub: "Improving your home's fabric could significantly change this outcome.",
      buttonLabel: "Find insulation specialists",
    };
  }
  return {
    heading: "Ready to take the next step?",
    sub: "Connect with a professional in your area.",
    buttonLabel: "Get in touch with a specialist",
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ReportPreviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reportId = searchParams.get("reportId");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Email report state
  const [emailForm, setEmailForm] = useState<EmailForm>({ email: "" });
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState<LeadForm>({
    name: "",
    email: "",
    phone: "",
    intent_timeline: "within_12_months",
    consent_installer_contact: false,
  });

  const viewFiredRef = useRef(false);

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
          throw new Error(text || "Failed to load report");
        }

        const json = (await res.json()) as PreviewData;
        setData(json);

        if (!viewFiredRef.current) {
          viewFiredRef.current = true;
          gaEvent("report_view", {
            report_id: reportId,
            verdict_class: json.verdictClass ?? undefined,
          });
        }
      } catch (e: any) {
        setError(e?.message ?? "Error loading report");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [reportId]);

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportId || emailSubmitting || !emailForm.email) return;

    gaEvent("report_email_submit", {
      report_id: reportId,
      verdict_class: data?.verdictClass ?? undefined,
    });

    try {
      setEmailSubmitting(true);
      setEmailError(null);

      const res = await fetch("/api/email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculation_id: reportId,
          email: emailForm.email,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to send email");
      }

      setEmailSent(true);
    } catch (e: any) {
      setEmailError(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setEmailSubmitting(false);
    }
  };

  const onLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportId || leadSubmitting) return;

    if (!leadForm.consent_installer_contact) {
      setLeadError("Please tick the consent box to continue.");
      return;
    }

    gaEvent("lead_submit_click", {
      report_id: reportId,
      verdict_class: data?.verdictClass ?? undefined,
      intent_timeline: leadForm.intent_timeline,
    });

    try {
      setLeadSubmitting(true);
      setLeadError(null);

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculation_id: reportId,
          name: leadForm.name,
          email: leadForm.email,
          phone: leadForm.phone || null,
          intent_timeline: leadForm.intent_timeline,
          consent_installer_contact: leadForm.consent_installer_contact,
          consent_marketing: false,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to submit");
      }

      gaEvent("lead_submitted", {
        report_id: reportId,
        verdict_class: data?.verdictClass ?? undefined,
      });

      setLeadSubmitted(true);
    } catch (e: any) {
      setLeadError(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10 text-center text-muted-foreground">
        Loading your report…
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10 text-center">
        <p className="text-destructive">{error}</p>
        <Button className="mt-4" variant="secondary" onClick={() => router.push("/calculator")}>
          Back to calculator
        </Button>
      </main>
    );
  }

  const verdictClass = data?.verdictClass ?? null;
  const confidence = data?.confidence ?? "";
  const context = data?.context ?? "";
  const gross = typeof data?.grossQuoteEur === "number" ? data.grossQuoteEur : null;
  const cta = getCtaCopy(verdictClass);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">

      {/* Report card */}
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="text-sm text-muted-foreground">Independent Screening Report</div>

          <h1 className="text-2xl font-semibold leading-tight">
            {gross
              ? `Before You Commit ${formatEUR(gross)}, Review Your Personalised Financial Outcome.`
              : "Your Personalised Heat Pump Financial Assessment"}
          </h1>

          <p className="text-sm text-muted-foreground">
            Based on your home, fuel usage and grant assumptions, a structured
            20-year financial screening model has been completed.
          </p>

          <VerdictBadge verdictClass={verdictClass} />
        </CardHeader>

        <CardContent className="space-y-8">

          {/* Finding */}
          <section className="rounded-xl border p-6 space-y-3">
            <div className="text-xs font-medium tracking-wide text-muted-foreground">FINDING</div>
            <div className="text-2xl font-semibold">{data?.headline ?? "Your Heat Pump Financial Verdict"}</div>
            {confidence && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Confidence: </span>{confidence}
              </div>
            )}
            <p className="text-sm text-muted-foreground">{context}</p>
          </section>

          {/* What's in the report */}
          <section className="space-y-3">
            <div className="text-sm font-medium">What's in your free report</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "20-year cost comparison vs your current fuel",
                "Grant-adjusted payback timeline",
                "Sensitivity analysis (electricity price ±15%)",
                "Fuel & electricity price escalation assumptions",
                "Risk assessment summary",
                "Assumptions and methodology transparency",
              ].map((t) => (
                <div key={t} className="rounded-lg border p-3 text-sm">{t}</div>
              ))}
            </div>
          </section>

          {/* Email report */}
          <section className="rounded-xl border p-4 space-y-3">
            <div className="text-sm font-medium">Get your full report by email</div>
            {emailSent ? (
              <p className="text-sm text-green-700">
                Report sent — check your inbox. If you found it useful, we'd really appreciate a Google review.
              </p>
            ) : (
              <form onSubmit={onEmailSubmit} className="flex gap-2">
                <Input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({ email: e.target.value })}
                  className="flex-1"
                />
                <Button type="submit" variant="secondary" disabled={emailSubmitting}>
                  {emailSubmitting ? "Sending…" : "Send"}
                </Button>
              </form>
            )}
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
          </section>

        </CardContent>
      </Card>

      {/* Next step — verdict-branched CTA */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{cta.heading}</h2>
            <p className="text-sm text-muted-foreground">{cta.sub}</p>
          </div>

          {leadSubmitted ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Thanks — we've passed your details to a specialist in your area. They'll be in touch shortly.
            </div>
          ) : showLeadForm ? (
            <form onSubmit={onLeadSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lead-name">Name</Label>
                  <Input
                    id="lead-name"
                    required
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-email">Email</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    required
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lead-phone">Phone (optional)</Label>
                  <Input
                    id="lead-phone"
                    type="tel"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-timeline">How soon are you thinking?</Label>
                  <select
                    id="lead-timeline"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={leadForm.intent_timeline}
                    onChange={(e) => setLeadForm({ ...leadForm, intent_timeline: e.target.value })}
                  >
                    <option value="researching">Just researching</option>
                    <option value="within_12_months">Within 12 months</option>
                    <option value="within_3_months">Within 3 months</option>
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="lead-consent"
                  type="checkbox"
                  className="mt-1"
                  checked={leadForm.consent_installer_contact}
                  onChange={(e) => setLeadForm({ ...leadForm, consent_installer_contact: e.target.checked })}
                />
                <label htmlFor="lead-consent" className="text-sm text-muted-foreground">
                  I agree to be contacted by a ClearHeat-listed specialist regarding my analysis.
                  My details will not be shared with anyone else.
                </label>
              </div>

              {leadError && (
                <p className="text-sm text-destructive">{leadError}</p>
              )}

              <Button type="submit" className="w-full" disabled={leadSubmitting}>
                {leadSubmitting ? "Submitting…" : cta.buttonLabel}
              </Button>

              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline"
                onClick={() => setShowLeadForm(false)}
              >
                Cancel
              </button>
            </form>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                setShowLeadForm(true);
                gaEvent("lead_cta_click", {
                  report_id: reportId,
                  verdict_class: verdictClass ?? undefined,
                });
              }}
            >
              {cta.buttonLabel}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Back */}
      <div className="text-center">
        <button
          className="text-sm text-muted-foreground underline"
          onClick={() => router.push("/calculator")}
        >
          Run another analysis
        </button>
      </div>

    </main>
  );
}
