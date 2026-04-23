import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

export async function GET(req: NextRequest) {
  try {
    const owner = req.nextUrl.searchParams.get("owner");
    const history = req.nextUrl.searchParams.get("history");
    const params = new URLSearchParams();
    if (owner) params.set("owner", owner);
    if (history) params.set("history", history);
    const url = `${BACKEND}/orders${params.size ? "?" + params.toString() : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json([], { status: 200 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
