import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

export async function GET(req: NextRequest) {
  try {
    const taker = req.nextUrl.searchParams.get("taker");
    const url = taker ? `${BACKEND}/trades?taker=${taker}` : `${BACKEND}/trades`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ trades: [] }, { status: 200 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ trades: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/trades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
