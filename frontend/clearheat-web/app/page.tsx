import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16 space-y-14">
      {/* Hero */}
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">ClearHeat</Badge>
            <Badge variant="outline">Ireland</Badge>
            <Badge variant="outline">Heat Pump Payback</Badge>
          </div>

          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Know if a heat pump will pay back{" "}
            <span className="underline underline-offset-4">before</span> you spend €10–€20k
          </h1>

          <p className="text-lg text-muted-foreground">
            Answer a few questions about your home and heating. Get a report with a clear verdict,
            estimated payback, and the assumptions behind it.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/calculator">Get your report</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Typical time: 2–4 minutes. No install commitment.
          </p>
        </div>

        {/* Offer stack */}
        <Card className="p-6 sm:p-8">
          <div className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">What you get</p>
              <h2 className="text-2xl font-semibold">ClearHeat Report (PDF)</h2>
            </div>

            <div className="grid gap-3">
              <div className="flex gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-foreground/70" />
                <div>
                  <p className="font-medium">Verdict</p>
                  <p className="text-sm text-muted-foreground">
                    Likely to save, borderline, or unlikely — based on your inputs.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-foreground/70" />
                <div>
                  <p className="font-medium">Payback estimate</p>
                  <p className="text-sm text-muted-foreground">
                    A realistic range, not a single over-confident number.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-foreground/70" />
                <div>
                  <p className="font-medium">Confidence + assumptions</p>
                  <p className="text-sm text-muted-foreground">
                    What we assumed, why, and how strong the conclusion is.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-foreground/70" />
                <div>
                  <p className="font-medium">Ready to share</p>
                  <p className="text-sm text-muted-foreground">
                    Send to an installer, partner, or keep as a record.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Best for</p>
                <p className="font-medium">Homeowners comparing options</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Not for</p>
                <p className="font-medium">People who won’t share any inputs</p>
              </Card>
            </div>

            <Button asChild size="lg" className="w-full">
              <Link href="/calculator">Generate report</Link>
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              This is an assessment tool, not a substitute for a site survey.
            </p>
          </div>
        </Card>
      </section>

      {/* Social proof / credibility */}
      <section className="grid gap-6 sm:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Built for clarity</p>
          <p className="mt-2 text-xl font-semibold">Verdict-first output</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No dashboards. No fluff. Just the decision and the reasoning in a report.
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Designed for uncertainty</p>
          <p className="mt-2 text-xl font-semibold">Confidence included</p>
          <p className="mt-2 text-sm text-muted-foreground">
            If bills are missing, we say so. If inputs are strong, we say so.
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Made for Ireland</p>
          <p className="mt-2 text-xl font-semibold">Grants + real costs</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your quote, your fuel, your electricity — not generic averages.
          </p>
        </Card>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold">How it works</h2>
          <p className="text-muted-foreground">
            Three steps in, report out. Keep it simple.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Step 1</p>
            <p className="mt-2 text-xl font-semibold">Home + usage</p>
            <p className="mt-2 text-sm text-muted-foreground">
              BER band, floor area, occupants, and how you typically heat the home.
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Step 2</p>
            <p className="mt-2 text-xl font-semibold">Current heating + bills</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Fuel type, prices, and either annual spend or annual use.
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Step 3</p>
            <p className="mt-2 text-xl font-semibold">Heat pump + grant</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your quote, emitters, and grant assumptions — then we generate the report.
            </p>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/calculator">Start</Link>
          </Button>
        </div>
      </section>

      {/* Objections */}
      <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold">Common questions</h2>
          <p className="text-muted-foreground">
            The point is to reduce uncertainty, not pretend it doesn’t exist.
          </p>
        </div>

        <div className="grid gap-4">
          <Card className="p-6">
            <p className="font-medium">Will this replace a site survey?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No. It’s an early-stage decision tool to tell you whether the economics look sensible
              and what assumptions drive the result.
            </p>
          </Card>

          <Card className="p-6">
            <p className="font-medium">What if I don’t know my annual bills?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You can still run it. The report will show lower confidence and the assumptions used.
            </p>
          </Card>

          <Card className="p-6">
            <p className="font-medium">Why does it ask about occupants and heating pattern?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Because behaviour changes demand. The model uses this to avoid false precision.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="rounded-2xl border p-8 text-center space-y-4">
        <h2 className="text-3xl font-semibold">Get your report</h2>
        <p className="text-muted-foreground">
          Make the call with a written verdict and payback estimate.
        </p>
        <Button asChild size="lg">
          <Link href="/calculator">Generate report</Link>
        </Button>
      </section>
    </main>
  );
}
