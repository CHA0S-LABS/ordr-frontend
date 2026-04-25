"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTokenBalances } from "@/app/hooks/useTokenBalances";
import { useRecentTrades } from "@/app/hooks/useRecentTrades";

const PRICE_SCALE = 1_000_000;
const SIZE_SCALE = 1_000_000_000;

const fp = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th className={`py-2 px-3 text-[11px] font-sans font-normal text-muted whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
    {children}
  </th>
);

const TD = ({ children, right, className }: { children: React.ReactNode; right?: boolean; className?: string }) => (
  <td className={`py-1.5 px-3 text-xs font-mono whitespace-nowrap ${right ? "text-right" : "text-left"} ${className ?? "text-foreground"}`}>
    {children}
  </td>
);

const Empty = ({ msg }: { msg: string }) => (
  <tr><td colSpan={99} className="text-center text-muted text-xs py-6">{msg}</td></tr>
);

function Balances({ owner }: { owner: string | null }) {
  const { baseBalance, quoteBalance } = useTokenBalances();
  const rows = [
    { token: "SOL (WSOL)", wallet: baseBalance !== null ? (baseBalance / SIZE_SCALE).toFixed(4) : "—" },
    { token: "USDC", wallet: quoteBalance !== null ? (quoteBalance / PRICE_SCALE).toFixed(2) : "—" },
  ];
  return (
    <table className="w-full">
      <thead className="border-b border-border sticky top-0 bg-surface">
        <tr><TH>Token</TH><TH right>Wallet Balance</TH></tr>
      </thead>
      <tbody>
        {!owner && <Empty msg="Connect wallet to view balances" />}
        {owner && rows.map(r => (
          <tr key={r.token} className="border-b border-border/40 hover:bg-surface-hover">
            <TD>{r.token}</TD>
            <TD right>{r.wallet}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TradeHistory({ owner }: { owner: string | null }) {
  const trades = useRecentTrades();
  const myTrades = owner ? trades.filter(t => t.taker === owner) : [];
  return (
    <table className="w-full">
      <thead className="border-b border-border sticky top-0 bg-surface">
        <tr><TH>Side</TH><TH right>Price (USD)</TH><TH right>Size (SOL)</TH><TH right>Time</TH></tr>
      </thead>
      <tbody>
        {!owner && <Empty msg="Connect wallet to view trade history" />}
        {owner && myTrades.length === 0 && <Empty msg="No trades yet" />}
        {myTrades.map(t => (
          <tr key={t.id} className="border-b border-border/40 hover:bg-surface-hover">
            <TD className={t.side === "bid" ? "text-bid" : "text-ask"}>{t.side === "bid" ? "Buy" : "Sell"}</TD>
            <TD right>{fp(t.price / PRICE_SCALE)}</TD>
            <TD right>{(t.size / SIZE_SCALE).toFixed(4)}</TD>
            <TD right className="text-muted">{formatTime(t.created_at)}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const TABS = ["Balances", "Trade History"] as const;
export type BottomTab = typeof TABS[number];

export default function BottomPanel({ activeTab, onTabChange }: {
  activeTab: BottomTab;
  onTabChange: (t: BottomTab) => void;
}) {
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58() ?? null;

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 h-10 border-b border-border bg-surface flex items-center px-4 space-x-6 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`h-full border-b-2 text-sm transition-colors whitespace-nowrap cursor-pointer ${activeTab === tab ? "text-foreground border-foreground font-medium" : "text-muted hover:text-foreground border-transparent"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {activeTab === "Balances"      && <Balances     owner={owner} />}
        {activeTab === "Trade History" && <TradeHistory owner={owner} />}
      </div>
    </div>
  );
}
