"use client";

import React, { useEffect, useRef, useState } from "react";
import { useOrderbook } from "@/app/hooks/useOrderbook";
import { useRecentTrades } from "@/app/hooks/useRecentTrades";

const PRICE_SCALE = 1_000_000;
const SIZE_SCALE = 1_000_000_000;

const fp = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n);

const fs_ = (n: number) => {
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  if (n >= 0.001) return n.toFixed(4);
  return n.toPrecision(2);
};

interface PriceLevel {
  rawPrice: number;
  price: number;
  size: number;
  sum: number;
  totalValue: number;
}

const OrderRow = ({
  price,
  size,
  sum,
  totalValue,
  type,
  maxSum,
  flashing,
}: {
  price: number;
  size: number;
  sum: number;
  totalValue: number;
  type: "ask" | "bid";
  maxSum: number;
  flashing?: boolean;
}) => {
  const depth = maxSum > 0 ? (sum / maxSum) * 100 : 0;
  const colorClass = type === "ask" ? "text-ask" : "text-bid";
  const bgClass = type === "ask" ? "bg-ask" : "bg-bid";
  const tooltipBorder = type === "ask" ? "border-ask/60" : "border-bid/60";
  const tooltipBg = type === "ask" ? "from-ask/20 to-transparent" : "from-bid/20 to-transparent";
  const avgPrice = sum > 0 ? totalValue / sum : price;

  const flashStyle: React.CSSProperties = flashing
    ? { backgroundColor: type === "bid" ? "rgba(58,191,114,0.4)" : "rgba(224,85,85,0.4)" }
    : {};

  return (
    <div
      className="group relative flex justify-between px-2 lg:px-4 py-0.5 text-xs font-mono tabular-nums leading-tight cursor-pointer hover:bg-surface-hover"
      style={{ transition: "background-color 0.5s ease", ...flashStyle }}
    >
      <div className={`absolute left-2 top-1/2 -translate-y-1/2 z-50 flex flex-col p-2 min-w-[160px] text-[11px] rounded shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md bg-background/90 border ${tooltipBorder} bg-gradient-to-r ${tooltipBg} pointer-events-none opacity-0 invisible scale-95 group-hover:opacity-100 group-hover:visible group-hover:scale-100 transition-all duration-200 ease-out origin-left`}>
        <div className="flex justify-between gap-4 mb-1.5 font-sans">
          <span className="text-muted">Avg. Price</span>
          <span className="text-primary font-mono">{fp(avgPrice)}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1.5 font-sans">
          <span className="text-muted">Total Qty</span>
          <span className="text-primary font-mono">{fp(sum)}</span>
        </div>
        <div className="flex justify-between gap-4 font-sans">
          <span className="text-muted">Total Value</span>
          <span className="text-primary font-mono">{fp(totalValue)}</span>
        </div>
      </div>

      <div
        className={`absolute inset-y-0 right-0 ${bgClass} opacity-15 dark:opacity-20`}
        style={{ width: `${depth}%`, transition: "width 0.4s ease" }}
      />
      <div className={`z-10 w-1/3 text-left ${colorClass} flex items-baseline gap-1`}>
        {fp(price)}
      </div>
      <div className="z-10 w-1/3 text-right text-primary">{fs_(size)}</div>
      <div className="z-10 w-1/3 text-right text-primary">{fs_(sum)}</div>
    </div>
  );
};

const PRICE_SCALE_T = 1_000_000;
const SIZE_SCALE_T = 1_000_000_000;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function RecentTradesPanel() {
  const trades = useRecentTrades();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between px-2 lg:px-4 py-2 border-b border-border text-[11px] font-sans text-muted shrink-0">
        <div className="w-1/3 text-left">Price (USD)</div>
        <div className="w-1/3 text-right">Size (SOL)</div>
        <div className="w-1/3 text-right">Time</div>
      </div>
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {trades.length === 0 && (
          <div className="text-center text-muted text-xs py-8">
            No trades yet
          </div>
        )}
        {trades.map((t) => (
          <div
            key={t.id}
            className="flex justify-between px-2 lg:px-4 py-0.5 text-xs font-mono tabular-nums hover:bg-surface-hover"
          >
            <div
              className={`w-1/3 text-left ${t.side === "bid" ? "text-bid" : "text-ask"}`}
            >
              {fp(t.price / PRICE_SCALE_T)}
            </div>
            <div className="w-1/3 text-right text-primary">
              {(t.size / SIZE_SCALE_T).toFixed(4)}
            </div>
            <div className="w-1/3 text-right text-muted">
              {formatTime(t.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrderBook() {
  const [tab, setTab] = useState<"book" | "trades">("book");
  const [viewMode, setViewMode] = useState<"both" | "bids" | "asks">("both");
  const ob = useOrderbook();
  const prevMidRef = useRef<number | null>(null);
  const [bidFlash, setBidFlash] = useState(false);
  const [askFlash, setAskFlash] = useState(false);

  useEffect(() => {
    const newMid = ob.mid;
    if (newMid === null) return;
    const prevMid = prevMidRef.current;
    prevMidRef.current = newMid;
    if (prevMid === null || prevMid === newMid) return;

    if (newMid > prevMid) {
      setBidFlash(true);
      setTimeout(() => setBidFlash(false), 500);
    } else {
      setAskFlash(true);
      setTimeout(() => setAskFlash(false), 500);
    }
  }, [ob]);

  const mid = ob.mid ? ob.mid / PRICE_SCALE : 0;

  let cumAsk = 0;
  let cumAskValue = 0;
  const askLevels: PriceLevel[] = [...ob.asks]
    .map((a) => {
      const size = a.size / SIZE_SCALE;
      const price = a.price / PRICE_SCALE;
      cumAsk += size;
      cumAskValue += size * price;
      return {
        rawPrice: a.price,
        price,
        size,
        sum: cumAsk,
        totalValue: cumAskValue,
      };
    })
    .reverse();

  let cumBid = 0;
  let cumBidValue = 0;
  const bidLevels: PriceLevel[] = ob.bids.map((b) => {
    const size = b.size / SIZE_SCALE;
    const price = b.price / PRICE_SCALE;
    cumBid += size;
    cumBidValue += size * price;
    return {
      rawPrice: b.price,
      price,
      size,
      sum: cumBid,
      totalValue: cumBidValue,
    };
  });

  const maxSum = Math.max(
    askLevels.length ? askLevels[0].sum : 0,
    bidLevels.length ? bidLevels[bidLevels.length - 1].sum : 0,
  );

  const totalBid = bidLevels.reduce((s, l) => s + l.size, 0);
  const totalAsk = askLevels.reduce((s, l) => s + l.size, 0);

  const total = totalBid + totalAsk;
  const bidPct = total > 0 ? Math.round((totalBid / total) * 100) : 50;
  const askPct = 100 - bidPct;
  const bestAsk = ob.asks[0] ? ob.asks[0].price / PRICE_SCALE : null;
  const bestBid = ob.bids[0] ? ob.bids[0].price / PRICE_SCALE : null;
  const spread =
    bestAsk !== null && bestBid !== null
      ? (bestAsk - bestBid).toFixed(3)
      : null;

  return (
    <div className="flex flex-col h-full overflow-hidden w-full bg-background transition-colors">
      <div className="h-16 flex items-end border-b border-border px-2 lg:px-4">
        <button
          onClick={() => setTab("book")}
          className={`font-sans text-sm pb-2 border-b-2 mr-6 cursor-pointer transition-colors ${tab === "book" ? "text-primary font-medium border-primary" : "text-muted border-transparent hover:text-primary"}`}
        >
          Book
        </button>
        <button
          onClick={() => setTab("trades")}
          className={`font-sans text-sm pb-2 border-b-2 cursor-pointer transition-colors ${tab === "trades" ? "text-primary font-medium border-primary" : "text-muted border-transparent hover:text-primary"}`}
        >
          Trades
        </button>
      </div>

      {tab === "trades" && (
        <div className="flex-1 overflow-hidden">
          <RecentTradesPanel />
        </div>
      )}

      {tab === "book" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex justify-end items-center px-2 lg:px-4 py-2 border-b border-border">
            <div className="flex space-x-2.5">
              <button 
                onClick={() => setViewMode("both")}
                className={`flex flex-col space-y-0.5 w-4 h-4 justify-center items-center hover:opacity-80 transition-opacity relative cursor-pointer ${viewMode === "both" ? "opacity-100" : "opacity-40"}`}
              >
                {viewMode === "both" && (
                  <div className="absolute -top-[10px] left-0 right-0 h-[2px] bg-primary" />
                )}
                <div className="w-3.5 h-1 bg-none border-b-2 border-ask" />
                <div className="w-3.5 h-1 bg-none border-b-2 border-bid" />
              </button>
              <button 
                onClick={() => setViewMode("bids")}
                className={`w-4 h-4 flex items-center justify-center hover:opacity-80 transition-opacity relative cursor-pointer ${viewMode === "bids" ? "opacity-100" : "opacity-40"}`}
              >
                {viewMode === "bids" && (
                  <div className="absolute -top-[10px] left-0 right-0 h-[2px] bg-primary" />
                )}
                <div className="w-3.5 h-[5px] bg-bid" />
              </button>
              <button 
                onClick={() => setViewMode("asks")}
                className={`w-4 h-4 flex items-center justify-center hover:opacity-80 transition-opacity relative cursor-pointer ${viewMode === "asks" ? "opacity-100" : "opacity-40"}`}
              >
                {viewMode === "asks" && (
                  <div className="absolute -top-[10px] left-0 right-0 h-[2px] bg-primary" />
                )}
                <div className="w-3.5 h-[5px] bg-ask" />
              </button>
            </div>
          </div>

          <div className="flex justify-between px-2 lg:px-4 py-2 border-b border-border text-[11px] font-sans text-muted">
            <div className="w-1/3 text-left">Price (USD)</div>
            <div className="w-1/3 text-right">Size (SOL)</div>
            <div className="w-1/3 text-right">Total (SOL)</div>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar py-2 flex flex-col justify-center">
            {viewMode !== "bids" && (
              <div className="flex flex-col">
                {askLevels.map((a, i) => (
                  <OrderRow
                    key={`ask-${i}-${a.rawPrice}`}
                    price={a.price}
                    size={a.size}
                    sum={a.sum}
                    totalValue={a.totalValue}
                    type="ask"
                    maxSum={maxSum}
                    flashing={askFlash}
                  />
                ))}
              </div>
            )}

            <div className="py-2 flex items-center px-2 lg:px-4 my-1">
              <div className="text-bid text-lg font-mono flex items-center mr-3 font-semibold">
                {mid > 0 ? fp(mid) : "—"}
                <span className="ml-1 text-base font-bold">↑</span>
              </div>
              <div className="text-xs text-primary font-sans mr-auto">
                {mid > 0 ? `$${fp(mid)}` : ""}
              </div>
              {spread !== null && (
                <div className="text-xs text-muted font-mono">
                  spread {spread}
                </div>
              )}
            </div>

            {viewMode !== "asks" && (
              <div className="flex flex-col">
                {bidLevels.map((b, i) => (
                  <OrderRow
                    key={`bid-${i}-${b.rawPrice}`}
                    price={b.price}
                    size={b.size}
                    sum={b.sum}
                    totalValue={b.totalValue}
                    type="bid"
                    maxSum={maxSum}
                    flashing={bidFlash}
                  />
                ))}
              </div>
            )}

            {ob.asks.length === 0 && ob.bids.length === 0 && (
              <div className="text-center text-muted text-xs py-4">
                No orders
              </div>
            )}
          </div>

          <div className="px-2 lg:px-4 py-3 mt-auto border-t border-border flex flex-col justify-center shrink-0">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-bid font-medium">Buy {bidPct}%</span>
              <span className="text-ask font-medium">{askPct}% Sell</span>
            </div>
            <div className="w-full h-1.5 flex rounded-sm overflow-hidden bg-surface">
              <div
                className="h-full bg-bid transition-all duration-500"
                style={{ width: `${bidPct}%` }}
              />
              <div
                className="h-full bg-ask opacity-80 transition-all duration-500"
                style={{ width: `${askPct}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
