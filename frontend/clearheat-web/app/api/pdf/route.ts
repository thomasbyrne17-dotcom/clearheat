import { NextResponse } from "next/server";

// Free PDF download — no payment required in phase 2.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get("reportId");

    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
    }

    const backend =
      process.env.NEXT_PUBLIC_BACKEND_BASE ||
      process.env.NEXT_PUBLIC_API_URL;

    if (!backend) {
      return NextResponse.json({ error: "Backend URL not configured" }, { status: 500 });
    }

    const r = await fetch(
      `${backend}/report/${encodeURIComponent(reportId)}/pdf`,
      { method: "GET" }
    );

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: "PDF fetch failed", details: text },
        { status: r.status }
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
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
