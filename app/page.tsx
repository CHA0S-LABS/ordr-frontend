"use client";

import Image from "next/image";
import dynamic from 'next/dynamic';
import { useState } from 'react';
import OrderBook from './components/OrderBook';
import OrderForm from './components/OrderForm';
import BottomPanel, { BottomTab } from './components/BottomPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { Menu, X } from 'lucide-react';
import { useBinanceTicker } from './hooks/useBinanceTicker';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

const Chart = dynamic(() => import('./components/Chart'), { ssr: false });

const PAIR = { label: 'SOL-USD', symbol: 'BINANCE:SOLUSDT', binanceSymbol: 'SOLUSDT' };

const HEADER_H = 92;
const BOTTOM_H = 40;

export default function Home() {
  const [activeTab, setActiveTab] = useState<BottomTab>('Balances');
  const [mobileView, setMobileView] = useState<'order' | 'charts'>('order');
  const [menuOpen, setMenuOpen] = useState(false);
  const ticker = useBinanceTicker(PAIR.binanceSymbol);
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  function handleConnect() {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  }

  return (
    <main className="bg-background text-foreground font-sans h-[100dvh] lg:h-auto overflow-hidden lg:overflow-visible flex flex-col lg:block relative">

      <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-surface">
        <div className="h-14 flex items-center justify-between px-3 md:px-5 border-b border-border">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <Image src="/logo.png" alt="ordr logo" width={42} height={42} className="rounded-full object-cover" />
              <span className="font-mono tracking-tighter text-3xl font-bold">ordr</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <button
              onClick={handleConnect}
              className="flex items-center px-3 py-1.5 border border-border text-xs font-mono hover:bg-surface-hover transition-colors cursor-pointer"
            >
              {connected && shortAddress ? shortAddress : 'Connect'}
            </button>
            <button
              className="p-1.5 hover:bg-surface-hover lg:hidden text-foreground cursor-pointer"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="h-9 flex items-center px-3 md:px-5 space-x-5 overflow-x-auto hide-scrollbar">
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="font-semibold text-foreground">{PAIR.label}</span>
            {ticker
              ? <span className={ticker.positive ? 'text-bid' : 'text-ask'}>{ticker.changePct}</span>
              : <span className="text-muted">—</span>
            }
          </div>
        </div>
      </header>

      <div
        className="flex-1 lg:flex-none flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-visible relative pb-14 lg:pb-0"
        style={{ height: `calc(100vh - ${HEADER_H}px - ${BOTTOM_H}px)` }}
      >
        <div className={`flex-1 flex-col bg-background min-w-0 border-b lg:border-b-0 lg:border-r border-border ${mobileView === 'order' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="h-16 flex items-center px-3 md:px-4 space-x-4 md:space-x-5 border-b border-border bg-surface shrink-0 overflow-x-auto hide-scrollbar">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-base font-bold tracking-wide">{PAIR.label}</span>
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
                <span className="text-xs font-mono text-foreground whitespace-nowrap">{value ?? '—'}</span>
              </div>
            ))}
          </div>

          <div className="h-10 border-b border-border flex items-center px-4 bg-surface shrink-0">
            <div className="flex space-x-4">
              {['5m', '15m', '1H', '4H', '1D'].map((tf, i) => (
                <span key={tf} className={`text-xs cursor-pointer transition-colors ${i === 0 ? 'text-foreground' : 'text-muted hover:text-foreground'}`}>
                  {tf}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 relative min-h-[300px] lg:min-h-0">
            <Chart symbol={PAIR.symbol} />
          </div>
        </div>

        <div className={`flex lg:flex ${mobileView === 'charts' ? 'hidden lg:flex' : 'flex-1 lg:flex-none'}`}>
          <div className="w-1/2 lg:w-[300px] xl:w-[320px] border-r border-border bg-background flex-shrink-0">
            <OrderBook />
          </div>
          <div className="w-1/2 lg:w-[300px] xl:w-[320px] bg-background flex-shrink-0 overflow-y-auto hide-scrollbar">
            <OrderForm />
          </div>
        </div>
      </div>

      <div className="lg:hidden absolute bottom-6 flex w-full justify-center pointer-events-none z-50">
        <div className="bg-surface border border-border rounded-full p-1 flex space-x-1 pointer-events-auto shadow-xl">
          <button
            onClick={() => setMobileView('order')}
            className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${mobileView === 'order' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground'}`}
          >
            Order
          </button>
          <button
            onClick={() => setMobileView('charts')}
            className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${mobileView === 'charts' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground'}`}
          >
            Charts
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 lg:hidden ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMenuOpen(false)}
      />

      <div
        className={`fixed top-0 right-0 z-[70] h-full w-64 bg-surface border-l border-border flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
          <span className="font-mono text-sm font-semibold text-foreground">Menu</span>
          <button className="p-1.5 hover:bg-surface-hover transition-colors text-foreground cursor-pointer" onClick={() => setMenuOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex flex-col flex-1 py-2">
          <span className="flex items-center px-5 py-3 text-sm font-medium text-foreground border-b border-border">Trade</span>
        </nav>
        <div className="px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={handleConnect}
            className="w-full py-2 border border-border text-xs font-mono text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            {connected && shortAddress ? shortAddress : 'Connect Wallet'}
          </button>
        </div>
      </div>

      <div className="hidden lg:block border-t border-border bg-surface" style={{ height: 260 }}>
        <BottomPanel activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </main>
  );
}
