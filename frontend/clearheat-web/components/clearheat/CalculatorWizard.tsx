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

export default function CalculatorWizard() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [loading, setLoading] = useState(false);
  const [lastInputs, setLastInputs] = useState<ClearHeatInput | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Old Stripe return params (kept so old links don’t explode, but no longer used)
  const sessionId = searchParams.get("session_id");
  const success = searchParams.get("success") === "1";

  useEffect(() => {
    if (success && sessionId) {
      gaEvent("stripe_return_success_legacy", { page_path: "/calculator" });
      // Don’t do anything else. Flow is now: Generate -> Interstitial -> Stripe
      router.replace("/calculator");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, sessionId]);

  const form = useForm<ClearHeatInput>({
    resolver: zodResolver(clearHeatSchema) as any,
    defaultValues: {
      ber_band: "C",
      floor_area_m2: 120,

      emitters: "radiators",

      // V2: new fields
      flow_temp_capability: "medium",
      dhw_on_same_fuel: true,

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

  async function generateAndGoToPreview(values: ClearHeatInput) {
    setLoading(true);
    setLastInputs(values);
    localStorage.setItem("ch_last_inputs", JSON.stringify(values));

    gaEvent("report_generate_click", {
      page_path: "/calculator",
      ber_band: values.ber_band,
      fuel_type: values.fuel_type,
      bill_mode: values.bill_mode,
      grant_applied: values.grant_applied,
      emitters: values.emitters,
      flow_temp_capability: (values as any).flow_temp_capability,
      dhw_on_same_fuel: (values as any).dhw_on_same_fuel,
    });

    try {
      // NEW: generate reportId (backend builds analysis + pdf and stores temporarily)
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: values }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Report generation failed");
      }

      const { reportId, verdictClass } = await res.json();

      gaEvent("report_generate_success", {
        page_path: "/calculator",
        report_id: reportId,
        verdict_class: verdictClass,
      });

      // Redirect to interstitial
      router.push(`/report-preview?reportId=${reportId}`);
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
            <Button
              onClick={form.handleSubmit(generateAndGoToPreview)}
              disabled={loading}
            >
              {loading ? "Generating…" : "Generate report"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}