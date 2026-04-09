"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "../components/Header";
import { useBinanceTicker } from "../hooks/useBinanceTicker";

const TOKENS = [
  { symbol: "SOL",  name: "Solana",   binanceSymbol: "SOLUSDT", logo: "https://assets.coingecko.com/coins/images/4128/small/solana.png" },
  { symbol: "USDC", name: "USD Coin", binanceSymbol: "",         logo: "https://assets.coingecko.com/coins/images/6319/small/usdc.png" },
  { symbol: "BTC",  name: "Bitcoin",  binanceSymbol: "BTCUSDT",  logo: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png" },
  { symbol: "ETH",  name: "Ethereum", binanceSymbol: "ETHUSDT",  logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png" },
];

function TokenIcon({ symbol, size = 20 }: { symbol: string; size?: number }) {
  const token = TOKENS.find(t => t.symbol === symbol);
  if (!token) return null;
  return (
    <Image
      src={token.logo}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full shrink-0"
    />
  );
}

function TokenSelector({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-surface-hover transition-colors group"
      >
        <TokenIcon symbol={value} />
        <span className="text-sm font-mono text-primary group-hover:text-muted transition-colors">{value}</span>
        <svg className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-40 bg-background border border-border z-50 shadow-xl">
          {TOKENS.map(t => (
            <button
              key={t.symbol}
              onClick={() => { onChange(t.symbol); setOpen(false); }}
              className="w-full flex items-center space-x-2 px-3 py-2 border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors text-sm text-primary"
            >
              <TokenIcon symbol={t.symbol} />
              <div className="text-left">
                <div className="font-mono">{t.symbol}</div>
                <div className="text-[10px] text-muted font-sans">{t.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceCard({ symbol }: { symbol: string }) {
  const binanceSym = TOKENS.find(t => t.symbol === symbol)?.binanceSymbol ?? "";
  const ticker = useBinanceTicker(binanceSym);
  
  if (!binanceSym || !ticker) return null;
  
  return (
    <div className="border border-border bg-background p-4 flex items-center justify-between w-full max-w-[420px] mt-4">
      <div className="flex items-center space-x-3">
        <TokenIcon symbol={symbol} />
        <div>
          <div className="text-sm font-semibold text-primary">{symbol}</div>
          <div className="text-[10px] text-muted font-mono">Market Oracle</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono text-primary">${ticker.price}</div>
        <div className={`text-xs font-mono font-medium ${ticker.positive ? 'text-bid' : 'text-ask'}`}>{ticker.changePct} 24h</div>
      </div>
    </div>
  );
}

export default function SwapPage() {
  const [payToken, setPayToken]     = useState("USDC");
  const [receiveToken, setReceiveToken] = useState("SOL");
  const [payAmount, setPayAmount]   = useState("");

  const flip = () => {
    setPayToken(receiveToken);
    setReceiveToken(payToken);
  };

  return (
    <main className="min-h-screen bg-background text-primary font-sans flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-start pt-12 md:pt-24 px-4">
        
        <div className="w-full max-w-[420px] border border-border bg-background flex flex-col">
          <div className="flex space-x-4 lg:space-x-6 px-4 pt-3 pb-2 border-b border-border text-xs lg:text-sm transition-colors">
            <button className="font-sans tracking-wide pb-1 border-b-2 text-primary border-primary transition-colors">Swap</button>
            <button className="font-sans tracking-wide pb-1 border-b-2 text-muted border-transparent hover:text-primary transition-colors">Limit</button>
            <button className="font-sans tracking-wide pb-1 border-b-2 text-muted border-transparent hover:text-primary transition-colors">DCA</button>
          </div>

          <div className="p-4 flex flex-col">
            <div className="flex justify-between text-xs text-muted mb-2 transition-colors">
              <span>You Pay</span>
              <span>Available <span className="text-primary font-mono ml-0.5">0.00</span></span>
            </div>
            <div className="relative bg-surface border border-border flex items-center p-2 focus-within:border-primary transition-colors mb-4 group">
              <input
                type="number"
                placeholder="0.00"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="bg-transparent text-primary font-mono text-xl w-full focus:outline-none placeholder:text-muted"
              />
              <div className="shrink-0 pl-1 ml-2 border-l border-border transition-colors">
                 <TokenSelector value={payToken} onChange={setPayToken} />
              </div>
            </div>

            <div className="relative flex justify-center -my-6 z-10 pointer-events-none">
              <button
                onClick={flip}
                className="bg-background border border-border p-1.5 hover:bg-surface-hover transition-colors pointer-events-auto rounded-sm group"
              >
                <svg className="w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            <div className="flex justify-between text-xs text-muted mb-2 mt-4 transition-colors">
              <span>You Receive</span>
            </div>
            <div className="relative bg-surface border border-border flex items-center p-2 transition-colors">
              <div className="text-muted font-mono text-xl w-full flex items-center">
                <span>0.00</span>
              </div>
              <div className="shrink-0 pl-1 ml-2 border-l border-border transition-colors">
                 <TokenSelector value={receiveToken} onChange={setReceiveToken} />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border space-y-2 text-xs font-mono transition-colors">
              <div className="flex justify-between">
                <span className="text-muted font-sans cursor-default">Execution Rate</span>
                <span className="text-primary">1 {payToken} ≈ 0.00 {receiveToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-sans cursor-default">Price Impact</span>
                <span className="text-bid">{'< 0.1%'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-sans cursor-default">Slippage Tolerance</span>
                <span className="text-primary">0.50%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-sans cursor-default">Network Fee</span>
                <span className="text-primary">$0.01</span>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button className="flex-1 bg-primary hover:bg-opacity-80 text-background font-sans font-medium py-2 rounded-md text-sm transition-opacity">
                Connect Wallet
              </button>
            </div>

          </div>
        </div>

        <PriceCard symbol={receiveToken} />

      </div>
    </main>
  );
}
