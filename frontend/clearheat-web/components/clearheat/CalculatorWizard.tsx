"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { clearHeatSchema, type ClearHeatInput } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import StepHome from "./StepHome";
import StepHeating from "./StepHeating";
import StepHeatPump from "./StepHeatPump";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_BASE ?? "http://127.0.0.1:8000";

export default function CalculatorWizard() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [reportReady, setReportReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastInputs, setLastInputs] = useState<ClearHeatInput | null>(null);

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

      bill_mode: "annual_spend",
      annual_spend_eur: 2400,
    },
  });

  async function runModel(values: ClearHeatInput) {
    setLoading(true);
    setLastInputs(values);

    try {
      const res = await fetch(`${BACKEND_BASE}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: values }),
      });

      if (!res.ok) throw new Error("Evaluation failed");

      await res.json();
      setReportReady(true); // ONLY unlocks download
    } catch (e: any) {
      alert(e?.message ?? "Error generating report");
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    if (!lastInputs) return;

    const res = await fetch(`${BACKEND_BASE}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: lastInputs }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clearheat_report.pdf";
    a.click();
    URL.revokeObjectURL(url);
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
            onClick={() => setStep((s) => (s - 1) as any)}
          >
            Back
          </Button>

          {step < 2 ? (
            <Button onClick={() => setStep((s) => (s + 1) as any)}>
              Next
            </Button>
          ) : (
            <Button onClick={form.handleSubmit(runModel)} disabled={loading}>
              {loading ? "Generating…" : "Generate report"}
            </Button>
          )}
        </div>

        {reportReady && (
          <div className="pt-6 border-t text-center">
            <Button onClick={downloadPdf}>Download report</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
