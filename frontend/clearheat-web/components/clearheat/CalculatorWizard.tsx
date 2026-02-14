"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import { clearHeatSchema, type ClearHeatInput } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import StepHome from "./StepHome";
import StepHeating from "./StepHeating";
import StepHeatPump from "./StepHeatPump";

/* ================================
   GA4 helper (safe no-op)
================================ */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function gaEvent(name: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}

/* ================================
   Backend
================================ */

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_BASE ?? "http://127.0.0.1:8000";

export default function CalculatorWizard() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [reportReady, setReportReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastInputs, setLastInputs] = useState<ClearHeatInput | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("session_id");
  const success = searchParams.get("success") === "1";

  // Optional: auto-scroll the user back to the download area after payment
  useEffect(() => {
    if (success && sessionId) {
      localStorage.setItem("ch_session_id", sessionId);

      gaEvent("stripe_return_success", { page_path: "/calculator" });

      setStep(2);
      setReportReady(true);
    }
  }, [success, sessionId]);


  const paidSessionId =
    sessionId ||
    (typeof window !== "undefined" ? localStorage.getItem("ch_session_id") : null);

  const isPaid = !!paidSessionId;

  const form = useForm<ClearHeatInput>({
    resolver: zodResolver(clearHeatSchema) as any,
    defaultValues: {
      ber_band: "C",
      floor_area_m2: 120,
      emitters: "radiators",

      heating_pattern: "normal",
      wood_use: "none",
      occupants: 2,

      fuel_type: "kerosene",
      fuel_price_eur_per_unit: 1.1,
      electricity_price_eur_per_kwh: 0.35,
      boiler_efficiency: 0.85,

      hp_quote_eur: 12000,
      grant_applied: true,
      grant_value_eur: 6500,

      // IMPORTANT: must match your schema union
      bill_mode: "annual_spend",
      annual_spend_eur: 2400,
    },
  });

  function stepName(s: number) {
    if (s === 0) return "home_usage";
    if (s === 1) return "heating_bills";
    return "heat_pump_grant";
  }

  function goToStep(next: 0 | 1 | 2) {
    setStep(next);
    gaEvent("calculator_step_view", {
      step_index: next,
      step_name: stepName(next),
      page_path: "/calculator",
    });
  }

  async function runModel(values: ClearHeatInput) {
    setLoading(true);
    setLastInputs(values);

    gaEvent("report_generate_click", {
      page_path: "/calculator",
      ber_band: values.ber_band,
      fuel_type: values.fuel_type,
      bill_mode: values.bill_mode,
      grant_applied: values.grant_applied,
    });

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: values }),
      });

      if (!res.ok) throw new Error("Evaluation failed");

      await res.json();

      setReportReady(true); // ONLY unlocks download

      gaEvent("report_generate_success", {
        page_path: "/calculator",
      });
    } catch (e: any) {
      gaEvent("report_generate_error", {
        page_path: "/calculator",
        error_message: String(e?.message ?? "unknown_error").slice(0, 120),
      });

      alert(e?.message ?? "Error generating report");
    } finally {
      setLoading(false);
    }
  }

    async function downloadPdf() {
    if (!lastInputs) return;

    gaEvent("report_download_click", { page_path: "/calculator" });

    try {
      // If not paid yet, start Stripe Checkout
      if (!paidSessionId) {
        const r = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
        });

        if (!r.ok) throw new Error("Failed to start checkout");

        const data = await r.json();
        if (!data?.url) throw new Error("Stripe checkout URL missing");

        window.location.href = data.url;
        return;
      }

      // Paid: fetch the PDF via Next.js API (server verifies Stripe + calls backend with secret header)
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: paidSessionId, inputs: lastInputs }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`PDF download failed: ${text}`);
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

      gaEvent("report_download_success", { page_path: "/calculator" });

      // Clean URL so refresh doesn't reuse an old session_id
      router.replace("/calculator");
    } catch (e: any) {
      gaEvent("report_download_error", {
        page_path: "/calculator",
        error_message: String(e?.message ?? "unknown_error").slice(0, 120),
      });

      alert(e?.message ?? "Error downloading PDF");
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {step === 0 && "Step 1: Home + usage"}
          {step === 1 && "Step 2: Current heating + bills"}
          {step === 2 && "Step 3: Heat pump + grant"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 0 && <StepHome form={form} />}
        {step === 1 && <StepHeating form={form} />}
        {step === 2 && <StepHeatPump form={form} />}

        <div className="flex justify-between">
          <Button
            variant="secondary"
            disabled={step === 0}
            onClick={() => goToStep((step - 1) as any)}
          >
            Back
          </Button>

          {step < 2 ? (
            <Button onClick={() => goToStep((step + 1) as any)}>Next</Button>
          ) : (
            <Button onClick={form.handleSubmit(runModel)} disabled={loading}>
              {loading ? "Generating…" : "Generate report"}
            </Button>
          )}
        </div>

        {reportReady && (
          <div className="pt-6 border-t text-center">
            <Button onClick={downloadPdf}>
              {isPaid ? "Download Report" : "Pay & Download Report"}
            </Button>

          </div>
        )}
      </CardContent>
    </Card>
  );
}
