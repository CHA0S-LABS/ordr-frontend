"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTokenBalances } from "@/app/hooks/useTokenBalances";
import { useMyOrders, orderPrice, orderSize, orderFilled } from "@/app/hooks/useMyOrders";
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
  <td className={`py-1.5 px-3 text-xs font-mono whitespace-nowrap ${right ? "text-right" : "text-left"} ${className ?? "text-primary"}`}>
    {children}
  </td>
);

const Empty = ({ msg }: { msg: string }) => (
  <tr><td colSpan={99} className="text-center text-muted text-xs py-6">{msg}</td></tr>
);

function OpenOrders({ owner }: { owner: string | null }) {
  const orders = useMyOrders(owner, false);
  return (
    <table className="w-full">
      <thead className="border-b border-border sticky top-0 bg-surface">
        <tr><TH>Side</TH><TH right>Price (USD)</TH><TH right>Size (SOL)</TH><TH right>Filled</TH><TH>Status</TH></tr>
      </thead>
      <tbody>
        {!owner && <Empty msg="Connect wallet to view orders" />}
        {owner && orders.length === 0 && <Empty msg="No open orders" />}
        {orders.map(o => (
          <tr key={o.order_id} className="border-b border-border/40 hover:bg-surface-hover">
            <TD className={o.side === "bid" ? "text-bid" : "text-ask"}>{o.side === "bid" ? "Buy" : "Sell"}</TD>
            <TD right>{fp(orderPrice(o))}</TD>
            <TD right>{orderSize(o).toFixed(4)}</TD>
            <TD right>{orderFilled(o).toFixed(4)}</TD>
            <TD className="text-muted capitalize">{o.status}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Balances({ owner }: { owner: string | null }) {
  const { baseBalance, quoteBalance } = useTokenBalances();
  const rows = [
    { token: "SOL (WSOL)", wallet: baseBalance !== null ? (baseBalance / SIZE_SCALE).toFixed(4) : "—", decimals: 9 },
    { token: "USDC", wallet: quoteBalance !== null ? (quoteBalance / PRICE_SCALE).toFixed(2) : "—", decimals: 6 },
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

function OrderHistory({ owner }: { owner: string | null }) {
  const orders = useMyOrders(owner, true);
  const history = orders.filter(o => o.status === "filled" || o.status === "cancelled");
  return (
    <table className="w-full">
      <thead className="border-b border-border sticky top-0 bg-surface">
        <tr><TH>Side</TH><TH right>Price (USD)</TH><TH right>Size (SOL)</TH><TH right>Filled</TH><TH>Status</TH></tr>
      </thead>
      <tbody>
        {!owner && <Empty msg="Connect wallet to view history" />}
        {owner && history.length === 0 && <Empty msg="No order history" />}
        {history.map(o => (
          <tr key={o.order_id} className="border-b border-border/40 hover:bg-surface-hover">
            <TD className={o.side === "bid" ? "text-bid" : "text-ask"}>{o.side === "bid" ? "Buy" : "Sell"}</TD>
            <TD right>{fp(orderPrice(o))}</TD>
            <TD right>{orderSize(o).toFixed(4)}</TD>
            <TD right>{orderFilled(o).toFixed(4)}</TD>
            <TD className="text-muted capitalize">{o.status}</TD>
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

const TABS = ["Open Orders", "Balances", "Order History", "Trade History"] as const;
type Tab = typeof TABS[number];

export default function BottomPanel({ activeTab, onTabChange }: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
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
            className={`h-full border-b-2 text-sm transition-colors whitespace-nowrap ${activeTab === tab ? "text-primary border-primary font-medium" : "text-muted hover:text-primary border-transparent"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {activeTab === "Open Orders"   && <OpenOrders   owner={owner} />}
        {activeTab === "Balances"      && <Balances     owner={owner} />}
        {activeTab === "Order History" && <OrderHistory owner={owner} />}
        {activeTab === "Trade History" && <TradeHistory owner={owner} />}
      </div>
    </div>
  );
}
