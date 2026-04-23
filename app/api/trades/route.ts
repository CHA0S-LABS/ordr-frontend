import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/trades`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ trades: [] }, { status: 200 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ trades: [] }, { status: 200 });
  }
}
