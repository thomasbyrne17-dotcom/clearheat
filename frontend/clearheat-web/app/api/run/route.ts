import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json(); // expects { inputs: {...} }

    const backend = process.env.NEXT_PUBLIC_BACKEND_BASE;
    if (!backend) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_BACKEND_BASE" }, { status: 500 });
    }

    const r = await fetch(`${backend}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
