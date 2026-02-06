import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ResultsPanel({
  result,
}: {
  result: {
    verdict: "LIKELY" | "UNLIKELY" | "UNCERTAIN";
    confidence: number;
    annual_savings_eur: [number, number];
    payback_years: [number, number];
    assumptions: string[];
    notes: string[];
  };
}) {
  const verdictLabel =
    result.verdict === "LIKELY"
      ? "Likely to save"
      : result.verdict === "UNLIKELY"
      ? "Unlikely to save"
      : "Uncertain";

  const confPct = Math.round(result.confidence * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge className="text-base py-1">{verdictLabel}</Badge>
        <p className="text-sm text-muted-foreground">Confidence: {confPct}%</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Annual savings</p>
          <p className="text-xl font-semibold">
            €{result.annual_savings_eur[0]} – €{result.annual_savings_eur[1]}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Payback</p>
          <p className="text-xl font-semibold">
            {result.payback_years[0]} – {result.payback_years[1]} years
          </p>
        </Card>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-medium">Notes</p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {result.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Assumptions</p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {result.assumptions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
