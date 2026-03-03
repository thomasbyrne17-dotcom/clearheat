import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const backend = process.env.NEXT_PUBLIC_BACKEND_BASE || process.env.NEXT_PUBLIC_API_URL
    if (!backend) {
      return NextResponse.json({ error: "NEXT_PUBLIC_BACKEND_BASE not set" }, { status: 500 })
    }

    const res = await fetch(`${backend}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let json: any
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }

    return NextResponse.json(json, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}