import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use – ClearHeat",
  description: "Terms governing your use of the ClearHeat heat pump screening tool.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <div className="space-y-2">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to ClearHeat
        </Link>
        <h1 className="text-3xl font-semibold">Terms of Use</h1>
        <p className="text-sm text-muted-foreground">Last updated: March 2025</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. About this tool</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          ClearHeat is a financial screening tool that helps Irish homeowners estimate
          whether a heat pump is likely to save money compared to their current heating
          system. It is operated at clearheat.ie.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          By using this website and calculator, you agree to these Terms of Use.
          If you do not agree, please do not use the site.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Not financial or professional advice</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The outputs produced by ClearHeat — including verdicts, payback estimates,
          NPV figures, and scenario analysis — are estimates based on the inputs you
          provide and a set of modelling assumptions. They are provided for informational
          purposes only.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          ClearHeat does not provide financial, tax, engineering, or professional advice.
          The tool is not a substitute for a home energy assessment or site survey by a
          qualified assessor or SEAI-registered installer. Before making any decision about
          purchasing a heat pump, you should obtain professional advice appropriate to your
          circumstances.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Accuracy of results</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Results depend entirely on the accuracy of the inputs you provide. ClearHeat
          makes no warranty that the calculator outputs are accurate, complete, or suitable
          for any particular purpose.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Actual savings, payback periods, and financial outcomes will differ from
          modelled estimates based on real-world factors including: actual heat pump
          performance, installation quality, changes in energy prices, changes to grant
          levels, occupant behaviour, and the physical characteristics of your home.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Limitation of liability</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          To the fullest extent permitted by law, ClearHeat shall not be liable for any
          loss or damage arising from your use of this tool or reliance on its outputs,
          including any direct, indirect, incidental, or consequential loss. This includes
          but is not limited to financial loss arising from a decision to purchase or not
          purchase a heat pump.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Installer referrals</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          If you submit your contact details to request installer quotes, ClearHeat will
          pass your details to a registered installer from its network. ClearHeat does not
          endorse any specific installer and is not responsible for the quality, pricing,
          or conduct of any installer it refers you to. Any contract for installation is
          solely between you and the installer.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. Intellectual property</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The ClearHeat brand, website, calculator methodology, and report content are the
          intellectual property of ClearHeat. You may not reproduce, distribute, or
          commercially exploit any part of this site without written permission.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Changes to these terms</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We may update these terms at any time. The date at the top of this page reflects
          the most recent revision. Continued use of the site after changes constitutes
          your acceptance of the updated terms.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">8. Governing law</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          These terms are governed by the laws of Ireland. Any disputes arising from your
          use of this site shall be subject to the exclusive jurisdiction of the Irish courts.
        </p>
      </section>

      <div className="border-t pt-6 text-sm text-muted-foreground">
        Questions? Email{" "}
        <a href="mailto:info@clearheat.ie" className="underline hover:text-foreground">
          info@clearheat.ie
        </a>
        {" "}·{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
      </div>
    </main>
  );
}
