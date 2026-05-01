"use client";

import Image from "next/image";
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
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

const HEADER_H = 56;
const BOTTOM_H = 40;

export default function Home() {
  const [activeTab, setActiveTab] = useState<BottomTab>('Balances');
  const [mobileView, setMobileView] = useState<'order' | 'charts'>('order');
  const [menuOpen, setMenuOpen] = useState(false);
  const [layoutState, setLayoutState] = useState<1 | 2 | 3 | 4>(1);
  const ticker = useBinanceTicker(PAIR.binanceSymbol);
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  useEffect(() => {
    const saved = localStorage.getItem('ordr-layout');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if ([1, 2, 3, 4].includes(parsed)) {
        setLayoutState(parsed as 1 | 2 | 3 | 4);
      }
    }
  }, []);

  const layout = layoutState;
  const setLayout = (newLayout: 1 | 2 | 3 | 4) => {
    if (layoutState === newLayout) return;
    
    const update = () => {
      setLayoutState(newLayout);
      localStorage.setItem('ordr-layout', newLayout.toString());
    };

    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        flushSync(() => {
          update();
        });
      });
    } else {
      update();
    }
  };

  const getChartClasses = () => {
    const base = "flex-1 flex-col bg-background min-w-0 border-b lg:border-b-0 border-border";
    const mobile = mobileView === 'order' ? 'hidden' : 'flex';
    if (layout === 1) return `${base} ${mobile} lg:flex lg:order-1 lg:border-r`;
    if (layout === 2) return `${base} ${mobile} lg:flex lg:order-2 lg:border-r`;
    if (layout === 3) return `${base} ${mobile} lg:hidden`;
    if (layout === 4) return `${base} ${mobile} lg:flex lg:order-1 lg:border-r`;
    return `${base} ${mobile} lg:flex lg:order-1 lg:border-r`;
  };

  const getMainClasses = () => {
    const base = "flex-1 lg:flex-none flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-visible relative pb-14 lg:pb-0";
    if (layout === 3) return `${base} lg:justify-center`;
    return base;
  };

  const getWrapperClasses = () => {
    if (mobileView === 'charts') return 'hidden lg:contents';
    return 'flex flex-1 lg:contents';
  };

  const getBookClasses = () => {
    const base = "w-1/2 bg-background flex-shrink-0 border-r border-border";
    if (layout === 1) return `${base} lg:w-[300px] xl:w-[320px] lg:block lg:order-2 lg:border-r`;
    if (layout === 2) return `${base} lg:w-[300px] xl:w-[320px] lg:block lg:order-1 lg:border-r`;
    if (layout === 3) return `${base} lg:w-[300px] xl:w-[320px] lg:block lg:order-1 lg:border-r`;
    if (layout === 4) return `${base} lg:hidden`;
    return `${base} lg:w-[300px] xl:w-[320px] lg:block lg:order-2 lg:border-r`;
  };

  const getFormClasses = () => {
    const base = "w-1/2 bg-background flex-shrink-0 overflow-y-auto hide-scrollbar";
    if (layout === 1) return `${base} lg:w-[300px] xl:w-[320px] lg:block lg:order-3`;
    if (layout === 2) return `${base} lg:w-[300px] xl:w-[320px] lg:block lg:order-3`;
    if (layout === 3) return `${base} lg:w-[300px] xl:w-[320px] lg:block lg:order-2`;
    if (layout === 4) return `${base} lg:w-[300px] xl:w-[320px] lg:block lg:order-2`;
    return `${base} lg:w-[300px] xl:w-[320px] lg:block lg:order-3`;
  };

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
            <div className="hidden lg:flex items-center space-x-3 mr-2 border-r border-border pr-4">
              <button
                onClick={() => setLayout(1)}
                className={`flex space-x-0.5 w-4 h-4 justify-center items-center hover:opacity-80 transition-opacity cursor-pointer ${layout === 1 ? "opacity-100" : "opacity-40"}`}
                title="Default (Chart | Book | Form)"
              >
                <div className="w-1.5 h-3 bg-primary" />
                <div className="w-0.5 h-3 bg-muted" />
                <div className="w-0.5 h-3 bg-muted" />
              </button>
              <button
                onClick={() => setLayout(2)}
                className={`flex space-x-0.5 w-4 h-4 justify-center items-center hover:opacity-80 transition-opacity cursor-pointer ${layout === 2 ? "opacity-100" : "opacity-40"}`}
                title="Book First (Book | Chart | Form)"
              >
                <div className="w-0.5 h-3 bg-muted" />
                <div className="w-1.5 h-3 bg-primary" />
                <div className="w-0.5 h-3 bg-muted" />
              </button>
              <button
                onClick={() => setLayout(3)}
                className={`flex space-x-0.5 w-4 h-4 justify-center items-center hover:opacity-80 transition-opacity cursor-pointer ${layout === 3 ? "opacity-100" : "opacity-40"}`}
                title="Compact (Book | Form)"
              >
                <div className="w-1.5 h-3 bg-muted" />
                <div className="w-1.5 h-3 bg-muted" />
              </button>
              <button
                onClick={() => setLayout(4)}
                className={`flex space-x-0.5 w-4 h-4 justify-center items-center hover:opacity-80 transition-opacity cursor-pointer ${layout === 4 ? "opacity-100" : "opacity-40"}`}
                title="Chart Only (Chart | Form)"
              >
                <div className="w-2 h-3 bg-primary" />
                <div className="w-0.5 h-3 bg-muted" />
              </button>
            </div>
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

      </header>

      <div
        className={getMainClasses()}
        style={{ height: `calc(100vh - ${HEADER_H}px - ${BOTTOM_H}px)` }}
      >
        <div className={getChartClasses()} style={{ viewTransitionName: 'chart-panel' }}>
          <div className="h-12 flex items-center px-3 md:px-4 space-x-4 md:space-x-6 border-b border-border bg-surface shrink-0 overflow-x-auto hide-scrollbar">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-base font-bold tracking-wide">{PAIR.label}</span>
            </div>
            <div className="flex items-baseline space-x-2 shrink-0">
              <span className={`text-lg font-mono font-semibold ${ticker?.positive !== false ? 'text-bid' : 'text-ask'}`}>{ticker?.price ?? '—'}</span>
              <span className={`text-xs font-mono ${ticker?.positive !== false ? 'text-bid' : 'text-ask'}`}>{ticker ? `${ticker.change} ${ticker.changePct}` : '—'}</span>
            </div>
            <div className="hidden md:block h-4 w-px bg-border shrink-0" />
            {[
              { label: 'Last Price', value: ticker?.lastPrice },
              { label: '24h Volume', value: ticker?.volume },
              { label: '24h High',   value: ticker?.high },
              { label: '24h Low',    value: ticker?.low },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center space-x-1.5 shrink-0">
                <span className="text-xs text-muted whitespace-nowrap">{label}</span>
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

        <div className={getWrapperClasses()}>
          <div className={getBookClasses()} style={{ viewTransitionName: 'book-panel' }}>
            <OrderBook />
          </div>
          <div className={getFormClasses()} style={{ viewTransitionName: 'form-panel' }}>
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
