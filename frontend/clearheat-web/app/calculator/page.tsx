import { Suspense } from "react";
import CalculatorWizard from "@/components/clearheat/CalculatorWizard";
import CalculatorStartedTracker from "@/components/clearheat/CalculatorStartedTracker";

export default function CalculatorPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <CalculatorStartedTracker />

      <h1 className="text-3xl font-semibold">ClearHeat Calculator</h1>
      <p className="mt-2 text-muted-foreground">
        Get a verdict, confidence score, and a report you can download.
      </p>

      <div className="mt-6">
        <Suspense fallback={null}>
          <CalculatorWizard />
        </Suspense>
      </div>
    </main>
  );
}
