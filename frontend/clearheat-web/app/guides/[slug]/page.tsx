import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

const articles: Record<string, { title: string; content: ReactNode }> = {
  "do-heat-pumps-save-money": {
    title: "Do Heat Pumps Actually Save Money in Ireland?",
    content: (
      <>
        <p>
          Heat pumps are often promoted as a cheaper and cleaner way to heat a home.
          But whether they actually save money in Ireland depends on several factors.
        </p>

        <h2 className="text-xl font-semibold mt-6">
          Why the answer depends on the house
        </h2>

        <p>
          A heat pump works differently from an oil or gas boiler. Instead of
          generating heat directly, it moves heat from outside into the home using
          electricity.
        </p>

        <p>
          Because of this, the financial outcome depends on electricity prices,
          system efficiency, insulation levels and the fuel being replaced.
        </p>

        <h2 className="text-xl font-semibold mt-6">
          When heat pumps can save money
        </h2>

        <p>
          In many Irish homes currently heated by oil or LPG, a well designed heat
          pump system can reduce long term heating costs.
        </p>

        <p>
          Grants can also significantly reduce the upfront installation cost,
          improving the overall financial outcome.
        </p>

        <h2 className="text-xl font-semibold mt-6">
          When they might not
        </h2>

        <p>
          Homes with poor insulation or high flow temperature heating systems may
          see smaller savings because the heat pump must work harder to maintain
          comfort.
        </p>

        <p>
          Installation cost also matters. Systems can cost €12,000–€20,000 before
          grants depending on the size of the home and the installation complexity.
        </p>

        <h2 className="text-xl font-semibold mt-6">
          The real question: your specific house
        </h2>

        <p>
          Because these factors vary widely, two houses on the same street can see
          completely different financial outcomes.
        </p>

        <p>
          The most reliable way to understand the economics is to evaluate the
          numbers using the details of your own home.
        </p>

        <p className="mt-6">
          You can estimate the financial outcome for your home using the ClearHeat
          calculator.
        </p>

        <Link href="/calculator" className="underline mt-2 inline-block">
          Run the ClearHeat analysis →
        </Link>
      </>
    ),
  },
};

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles[decodeURIComponent(slug)];

  if (!article) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
      <h1 className="text-4xl font-semibold">{article.title}</h1>
      <div className="prose max-w-none">
        {article.content}
      </div>
    </main>
  );
}