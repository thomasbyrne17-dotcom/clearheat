import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  const { session_id, inputs } = await req.json();

  const session = await stripe.checkout.sessions.retrieve(session_id);

  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
  }

  const res = await fetch(`${process.env.BACKEND_BASE}/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ClearHeat-PDF-Key": process.env.CLEARHEAT_PDF_KEY!,
    },
    body: JSON.stringify({ inputs }),
  });

  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=clearheat_report.pdf",
    },
  });
}
