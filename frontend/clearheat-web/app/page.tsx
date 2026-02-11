import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Logo from "@/components/clearheat/Logo";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 space-y-16">

      {/* Header */}
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/calculator">
          <Button size="sm">Get verdict</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Is a heat pump{" "}
            <span className="underline underline-offset-4">
              financially worth it
            </span>{" "}
            for your home?
          </h1>

          <p className="text-lg text-muted-foreground">
            Most online heat pump calculators are built by installers.
            ClearHeat is independent. It models your grant, fuel costs,
            electricity price and usage to give a clear financial verdict —
            not a sales estimate.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/calculator">Start free calculation</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Link href="#why-independent">Why this is different</Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>2–4 minutes</span>
            <span>No install commitment</span>
            <span>Built for Ireland</span>
          </div>
        </div>

        {/* Report Card */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">What you receive</p>
            <h2 className="text-2xl font-semibold">
              ClearHeat Financial Report (PDF)
            </h2>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Clear verdict</p>
              <p className="text-muted-foreground">
                Likely to save, borderline, or unlikely — stated plainly.
              </p>
            </div>

            <div>
              <p className="font-medium">Payback estimate (range)</p>
              <p className="text-muted-foreground">
                A realistic range, not a single over-confident number.
              </p>
            </div>

            <div>
              <p className="font-medium">Confidence score</p>
              <p className="text-muted-foreground">
                See how strong the conclusion is based on your inputs.
              </p>
            </div>

            <div>
              <p className="font-medium">Transparent assumptions</p>
              <p className="text-muted-foreground">
                Understand what drives the result and what could change it.
              </p>
            </div>
          </div>

          <Separator />

          <Button asChild size="lg" className="w-full">
            <Link href="/calculator">Generate report</Link>
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            This is a financial decision tool, not a substitute for a site survey.
          </p>
        </Card>
      </section>

      {/* Why Independent */}
      <section id="why-independent" className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold">
            Why ClearHeat is different
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Most calculators are designed to generate quotes. ClearHeat is
            designed to evaluate the decision.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 space-y-3">
            <p className="text-sm text-muted-foreground">Independent</p>
            <p className="font-semibold text-lg">
              Not installer-sponsored
            </p>
            <p className="text-sm text-muted-foreground">
              ClearHeat does not install heat pumps. The goal is financial
              clarity, not lead capture.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <p className="text-sm text-muted-foreground">Balanced</p>
            <p className="font-semibold text-lg">
              More realistic than 3-input tools
            </p>
            <p className="text-sm text-muted-foreground">
              Detailed enough to matter, simple enough to finish.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <p className="text-sm text-muted-foreground">Irish-specific</p>
            <p className="font-semibold text-lg">
              Grants + real local costs
            </p>
            <p className="text-sm text-muted-foreground">
              Built around Irish grants, fuel prices and electricity costs.
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-8">
        <div>
          <h2 className="text-3xl font-semibold">How it works</h2>
          <p className="text-muted-foreground">
            Three short steps. Clear output.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 space-y-2">
            <p className="text-sm text-muted-foreground">Step 1</p>
            <p className="font-semibold">Home + usage</p>
            <p className="text-sm text-muted-foreground">
              BER band, floor area and occupancy.
            </p>
          </Card>

          <Card className="p-6 space-y-2">
            <p className="text-sm text-muted-foreground">Step 2</p>
            <p className="font-semibold">Current heating</p>
            <p className="text-sm text-muted-foreground">
              Fuel type and annual spend or usage.
            </p>
          </Card>

          <Card className="p-6 space-y-2">
            <p className="text-sm text-muted-foreground">Step 3</p>
            <p className="font-semibold">Heat pump + grant</p>
            <p className="text-sm text-muted-foreground">
              Your quote and grant assumptions. Report generated instantly.
            </p>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/calculator">Start calculation</Link>
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="rounded-2xl border p-10 text-center space-y-6">
        <h2 className="text-3xl font-semibold">
          Make the decision with clarity
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Before committing €10,000–€20,000, get a written verdict and
          payback estimate based on your home.
        </p>
        <Button asChild size="lg">
          <Link href="/calculator">Generate your report</Link>
        </Button>
      </section>

    </main>
  );
}
