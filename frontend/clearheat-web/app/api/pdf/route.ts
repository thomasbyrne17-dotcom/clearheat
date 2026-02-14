import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { session_id, inputs } = await req.json();

    if (!session_id || !inputs) {
      return NextResponse.json({ error: "Missing session_id or inputs" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    const backend = process.env.NEXT_PUBLIC_BACKEND_BASE;
    const pdfKey = process.env.CLEARHEAT_PDF_KEY;

    if (!backend) return NextResponse.json({ error: "Missing NEXT_PUBLIC_BACKEND_BASE" }, { status: 500 });
    if (!pdfKey) return NextResponse.json({ error: "Missing CLEARHEAT_PDF_KEY" }, { status: 500 });

    const r = await fetch(`${backend}/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ClearHeat-PDF-Key": pdfKey,
      },
      body: JSON.stringify({ inputs }),
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: "Backend PDF failed", details: text }, { status: 500 });
    }

    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="clearheat_report.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
