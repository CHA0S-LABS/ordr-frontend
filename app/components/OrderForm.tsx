"use client";

import React, { useState } from 'react';
import { useMatchOrder } from '@/lib/solana/hooks/use-match-order';
import { useWallet } from '@solana/wallet-adapter-react';
import { useOrderbook } from '@/app/hooks/useOrderbook';
import { useTokenBalances } from '@/app/hooks/useTokenBalances';

const PRICE_SCALE = 1_000_000;
const SIZE_SCALE = 1_000_000_000;

const SLIPPAGE_PRESETS = ['0.1%', '0.5%', '1%'];

const fp = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export default function OrderForm() {
  const [slippage, setSlippage] = useState('0.5%');
  const [customSlippage, setCustomSlippage] = useState('');
  const [sizeVal, setSizeVal] = useState('');

  const { connected } = useWallet();
  const { submit, loading } = useMatchOrder();
  const ob = useOrderbook();
  const { baseBalance } = useTokenBalances();

  const bestAskRaw = ob.asks[0]?.price ?? null;
  const bestBidRaw = ob.bids[0]?.price ?? null;

  const availableSOL = baseBalance !== null ? baseBalance / SIZE_SCALE : null;
  const sizeInSol = parseFloat(sizeVal) || 0;
  const estFillAsk = bestAskRaw ? bestAskRaw / PRICE_SCALE : null;
  const estFillBid = bestBidRaw ? bestBidRaw / PRICE_SCALE : null;
  const midPrice = estFillAsk && estFillBid ? (estFillAsk + estFillBid) / 2 : estFillAsk ?? estFillBid;
  const orderValueUSD = sizeInSol > 0 && midPrice ? sizeInSol * midPrice : 0;
  const slippagePct = parseFloat(customSlippage || slippage.replace('%', '')) || 0.5;
  const takerFeeRate = 0.0025;
  const feeUSD = orderValueUSD * takerFeeRate;

  function handleOrder(side: 'bid' | 'ask') {
    const sizeRaw = Math.round(sizeInSol * SIZE_SCALE);
    if (!sizeRaw || sizeRaw <= 0) return;

    let limitPriceRaw: number | undefined;
    if (side === 'bid' && bestAskRaw !== null) {
      limitPriceRaw = Math.ceil(bestAskRaw * (1 + slippagePct / 100));
    } else if (side === 'ask' && bestBidRaw !== null) {
      limitPriceRaw = Math.floor(bestBidRaw * (1 - slippagePct / 100));
    }

    submit(side, sizeRaw, limitPriceRaw);
  }

  return (
    <div className="flex flex-col h-full w-full bg-background border-l border-border">
      <div className="h-10 flex items-center px-2 lg:px-4 border-b border-border">
        <span className="text-xs font-medium font-sans text-foreground">Market</span>
      </div>

      <div className="p-2 lg:p-4 flex-1 flex flex-col">
        <div className="space-y-3">
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>Size</span>
            <span>
              Available{' '}
              <span className="text-foreground">
                {availableSOL !== null ? `${availableSOL.toFixed(4)} SOL` : '—'}
              </span>
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="0.00"
              value={sizeVal}
              onChange={e => setSizeVal(e.target.value)}
              className="bg-surface border border-border text-foreground p-2 pr-12 font-mono text-sm w-full focus:outline-none focus:border-muted transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted border-l border-border pl-2">SOL</span>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => handleOrder('bid')}
            disabled={!connected || loading}
            className="flex-1 bg-bid hover:bg-bid-hover text-white font-sans font-semibold py-3 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Submitting...' : 'Buy'}
          </button>
          <button
            onClick={() => handleOrder('ask')}
            disabled={!connected || loading}
            className="flex-1 bg-ask hover:bg-ask-hover text-white font-sans font-semibold py-3 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Submitting...' : 'Sell'}
          </button>
        </div>

        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
            <span className="text-xs text-muted font-sans">Slippage</span>
            <div className="flex items-center space-x-1">
              {SLIPPAGE_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => { setSlippage(p); setCustomSlippage(''); }}
                  className={`px-2 py-0.5 text-[10px] font-mono border transition-colors cursor-pointer ${slippage === p && !customSlippage ? 'border-foreground text-foreground' : 'border-border text-muted hover:text-foreground'}`}
                >
                  {p}
                </button>
              ))}
              <input
                type="text"
                placeholder="Custom"
                value={customSlippage}
                onChange={e => { setCustomSlippage(e.target.value); setSlippage(''); }}
                className="w-14 px-2 py-0.5 text-[10px] font-mono border border-border bg-surface text-foreground focus:outline-none focus:border-foreground transition-colors placeholder:text-muted"
              />
            </div>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted font-sans">Order Value</span>
              <span className="text-foreground">{orderValueUSD > 0 ? `$${fp(orderValueUSD)}` : '$0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-sans">Est. Fill Price</span>
              <span className="text-foreground">
                {estFillBid && estFillAsk
                  ? `$${fp(estFillBid)} / $${fp(estFillAsk)}`
                  : midPrice ? `$${fp(midPrice)}` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-sans">Slippage</span>
              <span className="text-bid">{slippagePct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-sans">Taker Fee (0.25%)</span>
              <span className="text-foreground">{orderValueUSD > 0 ? `$${feeUSD.toFixed(4)}` : '$0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-sans">Network Fee</span>
              <span className="text-foreground">~$0.01</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-sans">Min Received</span>
              <span className="text-foreground">
                {sizeInSol > 0 ? `${(sizeInSol * (1 - slippagePct / 100)).toFixed(4)} SOL` : '—'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted font-sans font-semibold">Total Cost</span>
              <span className="text-foreground font-semibold">
                {orderValueUSD > 0 ? `$${fp(orderValueUSD + feeUSD + 0.01)}` : '$0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
