import Link from "next/link";

export default function GuidesPage() {
  const guides = [
    {
    slug: "do-heat-pumps-save-money",
    title: "Do Heat Pumps Actually Save Money in Ireland?",
    description: "The real factors that determine whether a heat pump saves money."
    },
    
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <h1 className="text-4xl font-semibold">Guides</h1>
      <p className="text-muted-foreground">
        Independent explanations to help homeowners understand heat pump economics.
      </p>

      <div className="grid gap-6">
        {guides.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`}>
            <div className="border rounded-xl p-6 hover:bg-muted transition">
              <h2 className="text-xl font-semibold">{g.title}</h2>
              <p className="text-muted-foreground text-sm mt-1">{g.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}