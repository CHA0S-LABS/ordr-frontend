"use client";

import { useEffect, useState } from "react";

export interface TickerData {
  price: string;
  change: string;
  changePct: string;
  positive: boolean;
  lastPrice: string;
  oracle: string;
  volume: string;
  oi: string;
  funding: string;
  high: string;
  low: string;
}

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toFixed(2);
}

function fmtUSD(n: number): string {
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2)  + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2)  + "M";
  if (n >= 1e3)  return "$" + (n / 1e3).toFixed(2)  + "K";
  return "$" + n.toFixed(2);
}

// Map our pair labels to CoinGecko IDs
const COINGECKO_ID: Record<string, string> = {
  SOLUSDT: "solana",
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
};

// Cache shared across all hook instances — one fetch for all pairs
let cache: Record<string, TickerData> = {};
let lastFetch = 0;
const listeners = new Set<() => void>();

async function fetchAll() {
  const now = Date.now();
  if (now - lastFetch < 15_000) return; // throttle: min 15s between fetches
  lastFetch = now;

  try {
    const ids = Object.values(COINGECKO_ID).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );
    if (!res.ok) return;
    const coins: Array<{
      id: string;
      current_price: number;
      price_change_24h: number;
      price_change_percentage_24h: number;
      high_24h: number;
      low_24h: number;
      total_volume: number;
      market_cap: number;
    }> = await res.json();

    // Rebuild cache indexed by binanceSymbol
    const byId: Record<string, (typeof coins)[0]> = {};
    for (const c of coins) byId[c.id] = c;

    for (const [binanceSym, cgId] of Object.entries(COINGECKO_ID)) {
      const c = byId[cgId];
      if (!c) continue;
      const positive = c.price_change_24h >= 0;
      cache[binanceSym] = {
        price:     fmt(c.current_price),
        change:    (positive ? "+" : "") + fmt(c.price_change_24h),
        changePct: (positive ? "+" : "") + c.price_change_percentage_24h.toFixed(2) + "%",
        positive,
        lastPrice: fmt(c.current_price),
        oracle:    fmt(c.current_price),
        volume:    fmtUSD(c.total_volume),
        oi:        fmtUSD(c.market_cap),
        funding:   "—",
        high:      fmt(c.high_24h),
        low:       fmt(c.low_24h),
      };
    }

    listeners.forEach(fn => fn());
  } catch {}
}

export function useBinanceTicker(binanceSymbol: string): TickerData | null {
  const [data, setData] = useState<TickerData | null>(cache[binanceSymbol] ?? null);

  useEffect(() => {
    const update = () => setData(cache[binanceSymbol] ?? null);
    listeners.add(update);

    fetchAll(); // fetch immediately
    const interval = setInterval(fetchAll, 30_000);

    return () => {
      listeners.delete(update);
      clearInterval(interval);
    };
  }, [binanceSymbol]);

  return data;
}
