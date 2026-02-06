import CalculatorWizard from "@/components/clearheat/CalculatorWizard";

export default function CalculatorPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold">ClearHeat Calculator</h1>
      <p className="mt-2 text-muted-foreground">
        Get a verdict, confidence score, and a report you can download.
      </p>

      <div className="mt-6">
        <CalculatorWizard />
      </div>
    </main>
  );
}
