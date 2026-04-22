"use client";

import { useEffect, useState } from "react";

export interface RawPriceLevel {
  price: number;
  size: number;
}

export interface OrderbookRaw {
  asks: RawPriceLevel[];
  bids: RawPriceLevel[];
  mid: number | null;
}

export function useOrderbook(): OrderbookRaw {
  const [data, setData] = useState<OrderbookRaw>({ asks: [], bids: [], mid: null });

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/orderbook");
        if (!res.ok || cancelled) return;
        const json: OrderbookRaw = await res.json();
        if (!cancelled) setData(json);
      } catch {}
    };

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return data;
}
