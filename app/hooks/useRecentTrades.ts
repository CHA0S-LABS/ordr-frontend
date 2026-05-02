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

export interface TradesState {
  trades: Trade[];
  loading: boolean;
}

export function useRecentTrades(): TradesState {
  const [state, setState] = useState<TradesState>({ trades: [], loading: true });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await window.fetch("/api/trades");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && Array.isArray(json.trades)) {
          setState({ trades: json.trades, loading: false });
        }
      } catch {}
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}
