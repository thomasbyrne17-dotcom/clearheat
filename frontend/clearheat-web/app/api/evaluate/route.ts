import { NextResponse } from "next/server";
import { clearHeatSchema } from "@/lib/schema";

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = clearHeatSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Mock output for now (replace with your Python model later)
  return NextResponse.json({
    verdict: "LIKELY",
    confidence: 0.78,
    annual_savings_eur: [300, 900],
    payback_years: [8, 14],
    assumptions: [
      "Electricity price held constant in real terms",
      "Typical seasonal efficiency assumed for system type and emitters",
      "No fabric upgrades included unless stated",
    ],
    notes: [
      parsed.data.annual_spend_eur
        ? "Annual spend provided: confidence increased."
        : "Annual spend missing: results rely on typical consumption estimates.",
    ],
    pdf_url: null,
  });
}
