import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("reportId");

  if (!reportId) {
    return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
  }

  const backend = process.env.NEXT_PUBLIC_BACKEND_BASE || process.env.NEXT_PUBLIC_API_URL;
  if (!backend) {
    return NextResponse.json({ error: "NEXT_PUBLIC_BACKEND_BASE not set" }, { status: 500 });
  }

  const res = await fetch(`${backend}/report/${encodeURIComponent(reportId)}/preview`, {
    method: "GET",
  });

  const text = await res.text();

  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return NextResponse.json({ error: text || "Bad response from backend" }, { status: res.status });
  }
}