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
