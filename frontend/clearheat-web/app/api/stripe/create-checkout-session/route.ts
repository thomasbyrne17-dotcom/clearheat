import Stripe from "stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!secretKey) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY in environment (.env.local)" },
      { status: 500 }
    );
  }
  if (!priceId) {
    return NextResponse.json(
      { error: "Missing STRIPE_PRICE_ID in environment (.env.local)" },
      { status: 500 }
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const reportId = body?.reportId;
  if (!reportId || typeof reportId !== "string") {
    return NextResponse.json(
      { error: "Missing reportId in request body" },
      { status: 400 }
    );
  }

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],

      // Keep the user in the interstitial flow after payment
      success_url: `${siteUrl}/report-preview?reportId=${encodeURIComponent(
        reportId
      )}&success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/report-preview?reportId=${encodeURIComponent(
        reportId
      )}&canceled=1`,

      // Critical for tying payment -> report
      metadata: {
        reportId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: String(e?.message ?? e),
        type: e?.type ?? null,
      },
      { status: 500 }
    );
  }
}