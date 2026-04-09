"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { useState } from 'react';
import OrderBook from './components/OrderBook';
import OrderForm from './components/OrderForm';
import { ThemeToggle } from './components/ThemeToggle';
import { Menu, X } from 'lucide-react';
import { useBinanceTicker } from './hooks/useBinanceTicker';

const Chart = dynamic(() => import('./components/Chart'), { ssr: false });

function TickerStripItem({ pair, active, onClick }: { pair: { label: string; binanceSymbol: string }; active: boolean; onClick: () => void }) {
  const ticker = useBinanceTicker(pair.binanceSymbol);
  return (
    <button
      onClick={onClick}
      className={`text-xs font-mono whitespace-nowrap transition-opacity ${active ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
    >
      <span className="font-semibold text-primary">{pair.label}</span>{' '}
      {ticker
        ? <span className={ticker.positive ? 'text-bid' : 'text-ask'}>{ticker.changePct}</span>
        : <span className="text-muted">—</span>
      }
    </button>
  );
}

const BOTTOM_TABS = ['Open Orders', 'Balances', 'Order History', 'Trade History'];

const PAIRS = [
  { label: 'SOL-USD', symbol: 'BINANCE:SOLUSDT', binanceSymbol: 'SOLUSDT' },
  { label: 'BTC-USD', symbol: 'BINANCE:BTCUSDT', binanceSymbol: 'BTCUSDT' },
  { label: 'ETH-USD', symbol: 'BINANCE:ETHUSDT', binanceSymbol: 'ETHUSDT' },
];

// Header heights: row1=56, row2=36 → total=92px. Bottom tab=40px.
const HEADER_H = 92;
const BOTTOM_H = 40;

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>(BOTTOM_TABS[0]);
  const [mobileView, setMobileView] = useState<'order' | 'charts'>('order');
  const [activePair, setActivePair] = useState(PAIRS[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const ticker = useBinanceTicker(activePair.binanceSymbol);

  return (
    <main className="bg-background text-primary font-sans h-[100dvh] lg:h-auto overflow-hidden lg:overflow-visible flex flex-col lg:block relative">

      {/* Header: Row 1 (nav) + Row 2 (ticker) only — no pair detail row */}
      <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-surface">
        {/* Row 1 */}
        <div className="h-14 flex items-center justify-between px-3 md:px-5 border-b border-border">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <Image src="/logo.png" alt="ordr logo" width={42} height={42} className="rounded-full object-cover" />
              <span className="font-mono tracking-tighter text-3xl font-bold">ordr</span>
            </div>
            <nav className="hidden md:flex items-center space-x-5 text-sm">
              <Link href="/" className="text-primary font-medium border-b border-primary pb-px">Trade</Link>
              <Link href="/swap" className="text-muted hover:text-primary transition-colors">Swap</Link>
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <button className="hidden sm:flex items-center px-3 py-1.5 border border-border text-xs font-mono hover:bg-surface-hover transition-colors">
              4YIY273..
            </button>
            <button
              className="p-1.5 hover:bg-surface-hover lg:hidden text-primary"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>


        {/* Row 2: Ticker strip */}
        <div className="h-9 flex items-center px-3 md:px-5 space-x-5 overflow-x-auto hide-scrollbar">
          {PAIRS.map(pair => (
            <TickerStripItem
              key={pair.label}
              pair={pair}
              active={activePair.label === pair.label}
              onClick={() => setActivePair(pair)}
            />
          ))}
        </div>
      </header>

      {/* Trading Area */}
      <div
        className="flex-1 lg:flex-none flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-visible relative pb-14 lg:pb-0"
        style={{ height: `calc(100vh - ${HEADER_H}px - ${BOTTOM_H}px)` }}
      >
        {/* Left: Chart */}
        <div className={`flex-1 flex-col bg-background min-w-0 border-b lg:border-b-0 lg:border-r border-border ${mobileView === 'order' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Pair detail sub-header — only in chart column */}
          <div className="h-16 flex items-center px-3 md:px-4 space-x-4 md:space-x-5 border-b border-border bg-surface shrink-0 overflow-x-auto hide-scrollbar">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-base font-bold tracking-wide">{activePair.label}</span>
            </div>
            <div className="flex flex-col shrink-0">
              <span className={`text-xl font-mono font-semibold ${ticker?.positive !== false ? 'text-bid' : 'text-ask'}`}>{ticker?.price ?? '—'}</span>
              <span className={`text-xs font-mono ${ticker?.positive !== false ? 'text-bid' : 'text-ask'}`}>{ticker ? `${ticker.change} ${ticker.changePct}` : '—'}</span>
            </div>
            <div className="hidden md:block h-6 w-px bg-border shrink-0" />
            {[
              { label: 'Last Price', value: ticker?.lastPrice },
              { label: '24h Volume', value: ticker?.volume },
              { label: '24h High',   value: ticker?.high },
              { label: '24h Low',    value: ticker?.low },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col shrink-0">
                <span className="text-[10px] text-muted whitespace-nowrap">{label}</span>
                <span className="text-xs font-mono text-primary whitespace-nowrap">{value ?? '—'}</span>
              </div>
            ))}
          </div>

          {/* Timeframe bar */}
          <div className="h-10 border-b border-border flex items-center px-4 bg-surface shrink-0">
            <div className="flex space-x-4">
              {['5m', '15m', '1H', '4H', '1D'].map((tf, i) => (
                <span key={tf} className={`text-xs cursor-pointer transition-colors ${i === 0 ? 'text-primary' : 'text-muted hover:text-primary'}`}>
                  {tf}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 relative min-h-[300px] lg:min-h-0">
            <Chart symbol={activePair.symbol} />
          </div>
        </div>

        {/* Center & Right: Orderbook & Orderform — start from top, no sub-header */}
        <div className={`flex lg:flex ${mobileView === 'charts' ? 'hidden lg:flex' : 'flex-1 lg:flex-none'}`}>
          <div className="w-1/2 lg:w-[300px] xl:w-[320px] border-r border-border bg-background flex-shrink-0">
            <OrderBook />
          </div>
          <div className="w-1/2 lg:w-[300px] xl:w-[320px] bg-background flex-shrink-0 overflow-y-auto hide-scrollbar">
            <OrderForm />
          </div>
        </div>
      </div>

      {/* Mobile Toggle */}
      <div className="lg:hidden absolute bottom-6 flex w-full justify-center pointer-events-none z-50">
        <div className="bg-surface border border-border rounded-full p-1 flex space-x-1 pointer-events-auto shadow-xl">
          <button
            onClick={() => setMobileView('order')}
            className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-colors ${mobileView === 'order' ? 'bg-primary text-background' : 'text-muted hover:text-primary'}`}
          >
            Order
          </button>
          <button
            onClick={() => setMobileView('charts')}
            className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-colors ${mobileView === 'charts' ? 'bg-primary text-background' : 'text-muted hover:text-primary'}`}
          >
            Charts
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 lg:hidden ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-64 bg-surface border-l border-border flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
          <span className="font-mono text-sm font-semibold text-primary">Menu</span>
          <button className="p-1.5 hover:bg-surface-hover transition-colors text-primary" onClick={() => setMenuOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex flex-col flex-1 py-2">
          <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center px-5 py-3 text-sm font-medium text-primary border-b border-border hover:bg-surface-hover transition-colors">Trade</Link>
          <Link href="/swap" onClick={() => setMenuOpen(false)} className="flex items-center px-5 py-3 text-sm text-muted border-b border-border hover:bg-surface-hover hover:text-primary transition-colors">Swap</Link>
        </nav>
        <div className="px-5 py-4 border-t border-border shrink-0">
          <button className="w-full py-2 border border-border text-xs font-mono text-primary hover:bg-surface-hover transition-colors">Connect Wallet</button>
        </div>
      </div>

      {/* Desktop Bottom Panel */}
      <div className="hidden lg:block">
        <div className="min-h-[260px] border-t border-border bg-surface flex items-center justify-center pb-10">
          <span className="text-muted text-xs">Nothing here yet.</span>
        </div>
        <div className="sticky bottom-0 z-50 w-full h-10 border-t border-border bg-surface flex items-center px-4 space-x-6 text-sm">
          {BOTTOM_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-full border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'text-primary border-primary font-medium' : 'text-muted hover:text-primary border-transparent'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
