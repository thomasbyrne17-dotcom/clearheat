import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy – ClearHeat",
  description: "How ClearHeat collects, uses, and protects your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <div className="space-y-2">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to ClearHeat
        </Link>
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: March 2025</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Who we are</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          ClearHeat is an independent heat pump financial screening tool for Irish homeowners,
          operated at clearheat.ie. For data protection purposes, ClearHeat is the data controller
          for personal data collected through this website.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Contact: <a href="mailto:info@clearheat.ie" className="underline hover:text-foreground">info@clearheat.ie</a>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. What data we collect and why</h2>

        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-medium text-sm">Calculator inputs</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              When you use the heat pump calculator, we store your property and energy inputs
              (BER band, floor area, house type, county, fuel type, heating spend, heat pump quote).
              This data contains no personal identifying information. We store it to generate
              your report and to improve the accuracy of the tool over time.
            </p>
            <p className="text-xs text-muted-foreground">
              Legal basis: Legitimate interest in providing and improving the service.
            </p>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-medium text-sm">Email address (report delivery)</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If you enter your email address to receive your report, we use it solely to send
              you the PDF and, if applicable, a single review request. We do not add you to a
              mailing list or share this address without your separate consent.
            </p>
            <p className="text-xs text-muted-foreground">
              Legal basis: Performance of the service you requested.
            </p>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-medium text-sm">Lead contact details (installer quotes)</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If you choose to request installer quotes, we collect your name, email, phone number,
              and relevant property details from your analysis. This data is shared with a registered
              heat pump installer from the ClearHeat network in your county so they can contact you.
              This only happens with your explicit consent, given by ticking the checkbox on the form.
            </p>
            <p className="text-xs text-muted-foreground">
              Legal basis: Your explicit consent (Article 6(1)(a) GDPR).
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Cookies and analytics</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We use Google Analytics to understand how the calculator is used — for example,
          which steps users drop off at, and how results are distributed. Google Analytics
          uses cookies to collect this data.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We only load Google Analytics if you accept cookies via the banner shown on your
          first visit. If you decline, no analytics cookies are set. You can change your
          preference at any time by clearing your browser's local storage for clearheat.ie.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We also use Vercel Analytics, which collects anonymised, aggregated traffic data
          with no cookies or personal data.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. How long we keep your data</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Anonymous calculator inputs are retained indefinitely for service improvement purposes.
          Email addresses collected for report delivery are retained for 12 months.
          Lead contact details are retained for 24 months or until you request deletion.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Your rights</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Under the GDPR and the Data Protection Act 2018, you have the right to:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data ("right to be forgotten")</li>
          <li>Withdraw consent at any time (where processing is based on consent)</li>
          <li>Object to processing based on legitimate interest</li>
          <li>Lodge a complaint with the Data Protection Commission Ireland (dataprotection.ie)</li>
        </ul>
        <p className="text-muted-foreground text-sm leading-relaxed">
          To exercise any of these rights, contact us at{" "}
          <a href="mailto:info@clearheat.ie" className="underline hover:text-foreground">
            info@clearheat.ie
          </a>
          . We will respond within 30 days.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. Third parties</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We use the following third-party services:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li><strong>Supabase</strong> — database hosting (data stored in EU region)</li>
          <li><strong>Resend</strong> — transactional email delivery</li>
          <li><strong>Vercel</strong> — website hosting and analytics</li>
          <li><strong>Google Analytics</strong> — usage analytics (only with your consent)</li>
        </ul>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We do not sell your data to any third party.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Changes to this policy</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We may update this policy from time to time. The date at the top of the page
          reflects when it was last revised. Continued use of the site after changes
          constitutes acceptance of the updated policy.
        </p>
      </section>

      <div className="border-t pt-6 text-sm text-muted-foreground">
        Questions? Email{" "}
        <a href="mailto:info@clearheat.ie" className="underline hover:text-foreground">
          info@clearheat.ie
        </a>
        {" "}·{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms of Use
        </Link>
      </div>
    </main>
  );
}
