"use client";

import { useEffect, useState } from "react";

export interface Trade {
  id: number;
  price: number;
  size: number;
  side: "bid" | "ask";
  taker: string;
  created_at: string;
}

const POLL_MS = 3000;

export function useRecentTrades(): Trade[] {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const res = await window.fetch("/api/trades");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && Array.isArray(json.trades)) {
          setTrades(json.trades);
        }
      } catch {}
    }

    fetch();
    const id = setInterval(fetch, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return trades;
}
