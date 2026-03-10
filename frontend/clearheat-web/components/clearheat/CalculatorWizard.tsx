"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  clearHeatSchema,
  type ClearHeatInput,
  BOILER_AGE_TO_EFFICIENCY,
} from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import StepHome from "./StepHome";
import StepHeating from "./StepHeating";
import StepHeatPump from "./StepHeatPump";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function gaEvent(name: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}

// Fields that belong to each step — used for per-step validation
const STEP_FIELDS: Record<number, (keyof ClearHeatInput)[]> = {
  0: ["ber_band", "floor_area_m2", "occupants", "heating_pattern", "wood_use"],
  1: ["fuel_type", "fuel_price_eur_per_unit", "electricity_price_eur_per_kwh", "boiler_age", "bill_mode", "annual_spend_eur", "annual_fuel_use"],
  2: ["emitters", "grant_applied", "grant_value_eur"],
};

export default function CalculatorWizard() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [loading, setLoading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("session_id");
  const success = searchParams.get("success") === "1";

  useEffect(() => {
    if (success && sessionId) {
      gaEvent("stripe_return_success_legacy", { page_path: "/calculator" });
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
      flow_temp_capability: "medium",
      dhw_on_same_fuel: true,
      heating_pattern: "normal",
      wood_use: "none",
      occupants: 2,
      fuel_type: "kerosene",
      fuel_price_eur_per_unit: 1.1,
      electricity_price_eur_per_kwh: 0.35,
      boiler_age: "2000s",
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

  async function tryGoToStep(next: 0 | 1 | 2) {
    // Going back — no validation needed
    if (next < step) {
      setStepError(null);
      setStep(next);
      gaEvent("calculator_step_view", { step_index: next, step_name: stepName(next), page_path: "/calculator" });
      return;
    }

    // Validate current step's fields before advancing
    const valid = await form.trigger(STEP_FIELDS[step]);
    if (!valid) {
      setStepError("Please fill in all required fields above before continuing.");
      return;
    }

    setStepError(null);
    setStep(next);
    gaEvent("calculator_step_view", { step_index: next, step_name: stepName(next), page_path: "/calculator" });
  }

  async function generateAndGoToPreview(values: ClearHeatInput) {
    setLoading(true);

    // Convert boiler_age to boiler_efficiency for the engine
    const boilerEfficiency = BOILER_AGE_TO_EFFICIENCY[values.boiler_age] ?? 0.84;
    const engineInputs = {
      ...values,
      boiler_efficiency: boilerEfficiency,
    };

    gaEvent("report_generate_click", {
      page_path: "/calculator",
      ber_band: values.ber_band,
      fuel_type: values.fuel_type,
      bill_mode: values.bill_mode,
      grant_applied: values.grant_applied,
      emitters: values.emitters,
      flow_temp_capability: values.flow_temp_capability,
      dhw_on_same_fuel: values.dhw_on_same_fuel,
      boiler_age: values.boiler_age,
    });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: engineInputs }),
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

  const progressPct = ((step + 1) / 3) * 100;

  return (
    <Card>
      <CardHeader className="pb-2 space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {step + 1} of 3</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <CardTitle>
          {step === 0 && "Step 1: Your home"}
          {step === 1 && "Step 2: Heating + bills"}
          {step === 2 && "Step 3: Heat pump + grant"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 0 && <StepHome form={form} />}
        {step === 1 && <StepHeating form={form} />}
        {step === 2 && <StepHeatPump form={form} />}

        {/* Step-level validation error */}
        {stepError && (
          <p className="text-sm text-destructive">{stepError}</p>
        )}

        <div className="flex justify-between">
          <Button
            variant="secondary"
            disabled={step === 0}
            onClick={() => tryGoToStep((step - 1) as any)}
          >
            Back
          </Button>

          {step < 2 ? (
            <Button onClick={() => tryGoToStep((step + 1) as any)}>Next</Button>
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
