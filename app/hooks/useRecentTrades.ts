"use client";

import { useEffect, useState } from "react";
import { subscribeWs } from "@/lib/ws-client";

export interface Trade {
  id: number;
  price: number;
  size: number;
  side: "bid" | "ask";
  taker: string;
  created_at: string;
}

export function useRecentTrades(): Trade[] {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    // Seed with HTTP fetch
    fetch("/api/trades")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.trades) setTrades(json.trades); })
      .catch(() => {});

    const unsub = subscribeWs((msg) => {
      if (msg.type === "trade") {
        setTrades((prev) => {
          // Prepend new trade, keep max 50
          const next = [msg.data as Trade, ...prev];
          return next.slice(0, 50);
        });
      }
    });

    return unsub;
  }, []);

  return trades;
}
