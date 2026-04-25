"use client";

import { useEffect, useState } from "react";
import { subscribeWs, WsOrderbook } from "@/lib/ws-client";

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
    // Seed with HTTP fetch so there's data before first WS push
    fetch("/api/orderbook")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json) setData(json); })
      .catch(() => {});

    const unsub = subscribeWs((msg) => {
      if (msg.type === "orderbook") setData(msg.data);
    });

    return unsub;
  }, []);

  return data;
}
