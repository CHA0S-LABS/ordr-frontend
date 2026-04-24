"use client";

import { useEffect, useState } from "react";

export interface MyOrder {
  order_id: number;
  side: "bid" | "ask";
  offset: number;
  size: number;
  filled_size: number;
  status: string;
  mid_price: number;
  tick_size: number;
}

const POLL_MS = 3000;
const PRICE_SCALE = 1_000_000;
const SIZE_SCALE = 1_000_000_000;

export function useMyOrders(owner: string | null, history = false) {
  const [orders, setOrders] = useState<MyOrder[]>([]);

  useEffect(() => {
    if (!owner) { setOrders([]); return; }
    let cancelled = false;

    async function fetch() {
      try {
        const params = new URLSearchParams({ owner: owner! });
        if (history) params.set("history", "true");
        const res = await window.fetch(`/api/orders?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setOrders(data);
      } catch {}
    }

    fetch();
    const id = setInterval(fetch, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [owner, history]);

  return orders;
}

export function orderPrice(o: MyOrder): number {
  return (o.mid_price + o.offset * o.tick_size) / PRICE_SCALE;
}

export function orderSize(o: MyOrder): number {
  return o.size / SIZE_SCALE;
}

export function orderFilled(o: MyOrder): number {
  return o.filled_size / SIZE_SCALE;
}
