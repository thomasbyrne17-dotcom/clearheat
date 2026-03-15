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

        <div className="flex items-center gap-3">
          <Link href="/guides">
            <Button variant="ghost" size="sm">
              Guides
            </Button>
          </Link>

          <Link href="/calculator">
            <Button size="sm">Get Verdict</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Should You Get a Heat Pump?
            <br />
            <span className="text-muted-foreground">A €20,000 decision.</span>
            <br />
            <span className="underline underline-offset-4">Free to find out.</span>
          </h1>

          <p className="text-lg text-muted-foreground">
            Most online heat pump calculators are built by installers.
            <br />
            ClearHeat is independent. It models grant impact, fuel costs,
            electricity price and usage to produce a plain-English financial
            verdict — not a sales estimate.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/calculator">Start Calculation</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Link href="#why-independent">Why This is Different</Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>2–4 minutes</span>
            <span>No quote needed</span>
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

          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>
              <span className="text-foreground font-medium">
                Clear financial verdict
              </span>{" "}
              — likely saves, borderline, or unlikely
            </li>
            <li>
              <span className="text-foreground font-medium">
                Affordable budget table
              </span>{" "}
              — what your savings justify at 8, 10, 12 &amp; 15-year payback horizons
            </li>
            <li>Best / typical / worst performance scenarios</li>
            <li>20-year cumulative savings vs upfront cost</li>
            <li>Sensitivity analysis (electricity price ±15%)</li>
            <li>If you have a quote: personalised payback across scenarios</li>
            <li>Transparent methodology &amp; modelling assumptions</li>
          </ul>

          <Separator />

          <div className="space-y-2">
            <Button asChild size="lg" className="w-full">
              <Link href="/calculator">Get Free Report</Link>
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Free • Report delivered by email • No account needed
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Financial decision tool only — not a substitute for a site survey.
          </p>
        </Card>
      </section>

      {/* Why Independent */}
      <section id="why-independent" className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold">Why ClearHeat is Different</h2>
          <p className="text-muted-foreground max-w-2xl">
            Most calculators are designed to generate leads or quotes. ClearHeat
            is designed to evaluate the decision.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 space-y-3">
            <p className="text-sm text-muted-foreground">Independent</p>
            <p className="font-semibold text-lg">Verdict first, always</p>
            <p className="text-sm text-muted-foreground">
              The financial analysis is never influenced by installers.
              If you want quotes afterwards, that&apos;s your choice — not the
              starting point.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <p className="text-sm text-muted-foreground">More grounded</p>
            <p className="font-semibold text-lg">
              Models real inputs, not wishful defaults
            </p>
            <p className="text-sm text-muted-foreground">
              Uses fuel price, electricity price, boiler age, grant
              impact and usage patterns — not a single "COP" number.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <p className="text-sm text-muted-foreground">Irish-specific</p>
            <p className="font-semibold text-lg">Grants &amp; real local costs</p>
            <p className="text-sm text-muted-foreground">
              Built around Irish grants, common fuels, and typical electricity
              pricing.
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-8">
        <div>
          <h2 className="text-3xl font-semibold">How it works</h2>
          <p className="text-muted-foreground">Three short steps. Clear output.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 space-y-2">
            <p className="text-sm text-muted-foreground">Step 1</p>
            <p className="font-semibold">Home + usage</p>
            <p className="text-sm text-muted-foreground">
              BER band, floor area, house type and occupancy.
            </p>
          </Card>

          <Card className="p-6 space-y-2">
            <p className="text-sm text-muted-foreground">Step 2</p>
            <p className="font-semibold">Current heating</p>
            <p className="text-sm text-muted-foreground">
              Fuel type, boiler age and annual spend or usage.
            </p>
          </Card>

          <Card className="p-6 space-y-2">
            <p className="text-sm text-muted-foreground">Step 3</p>
            <p className="font-semibold">Heat pump + grant</p>
            <p className="text-sm text-muted-foreground">
              Grant assumptions and your quote if you have one.
              No quote? The report shows what budget your savings can justify.
            </p>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/calculator">Start Calculation</Link>
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="rounded-2xl border p-10 text-center space-y-6">
        <h2 className="text-3xl font-semibold">Make the decision with clarity</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Before committing €10,000–€20,000, get a written verdict,
          payback range, and transparent assumptions based on your home.
          Free, independent, built for Ireland.
        </p>
        <Button asChild size="lg">
          <Link href="/calculator">Get Free Report</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Free • No account needed • Report by email
        </p>
      </section>
    </main>
  );
}
