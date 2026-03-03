import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { session_id, reportId } = await req.json();

    if (!session_id || !reportId) {
      return NextResponse.json(
        { error: "Missing session_id or reportId" },
        { status: 400 }
      );
    }

    // 1) Verify Stripe payment
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 402 }
      );
    }

    // 2) Verify the reportId matches what was paid for
    const paidReportId = (session.metadata as any)?.reportId;
    if (!paidReportId) {
      return NextResponse.json(
        { error: "Stripe session missing reportId metadata" },
        { status: 500 }
      );
    }

    if (paidReportId !== reportId) {
      return NextResponse.json(
        { error: "ReportId does not match paid session" },
        { status: 403 }
      );
    }

    // 3) Fetch PDF from backend by reportId
    const backend =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_BASE;

    if (!backend) {
      return NextResponse.json(
        { error: "Missing backend base URL env var" },
        { status: 500 }
      );
    }

    const r = await fetch(
      `${backend}/report/${encodeURIComponent(reportId)}/pdf`,
      { method: "GET" }
    );

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: "Backend PDF fetch failed", details: text },
        { status: 500 }
      );
    }

    const buf = await r.arrayBuffer();

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="clearheat_report.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}