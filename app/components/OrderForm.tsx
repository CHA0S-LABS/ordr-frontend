"use client";

import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
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
  const [tab, setTab] = useState<'limit' | 'market'>('market');
  const [sliderVal, setSliderVal] = useState([27]);
  const [slippage, setSlippage] = useState('0.5%');
  const [customSlippage, setCustomSlippage] = useState('');
  const [sizeVal, setSizeVal] = useState('');
  const [limitPriceVal, setLimitPriceVal] = useState('');

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

  function handleOrder(side: 'bid' | 'ask') {
    const sizeRaw = Math.round(sizeInSol * SIZE_SCALE);
    if (!sizeRaw || sizeRaw <= 0) return;

    let limitPriceRaw: number | undefined;

    if (tab === 'limit') {
      if (limitPriceVal) {
        limitPriceRaw = Math.round(parseFloat(limitPriceVal) * PRICE_SCALE);
      }
    } else {
      const slippagePct = parseFloat(customSlippage || slippage.replace('%', '')) || 0.5;
      if (side === 'bid' && bestAskRaw !== null) {
        limitPriceRaw = Math.ceil(bestAskRaw * (1 + slippagePct / 100));
      } else if (side === 'ask' && bestBidRaw !== null) {
        limitPriceRaw = Math.floor(bestBidRaw * (1 - slippagePct / 100));
      }
    }

    submit(side, sizeRaw, limitPriceRaw);
  }

  const slippagePct = parseFloat(customSlippage || slippage.replace('%', '')) || 0.5;
  const takerFeeRate = 0.0025;
  const feeUSD = orderValueUSD * takerFeeRate;
  const makerFeeRate = 0.001;
  const makerFeeUSD = orderValueUSD * makerFeeRate;

  return (
    <div className="flex flex-col h-full w-full bg-background border-l border-border">
      <div className="h-16 flex items-end space-x-4 lg:space-x-6 px-2 lg:px-4 pb-2 border-b border-border text-xs lg:text-sm">
        <button
          className={`font-sans tracking-wide pb-1 border-b-2 transition-colors ${tab === 'market' ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-primary'}`}
          onClick={() => setTab('market')}
        >
          Market
        </button>
        <button
          className={`font-sans tracking-wide pb-1 border-b-2 transition-colors ${tab === 'limit' ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-primary'}`}
          onClick={() => setTab('limit')}
        >
          Limit
        </button>
      </div>

      <div className="p-2 lg:p-4 flex-1 flex flex-col">
        <div className="space-y-4">
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>Size</span>
            <span>
              Available{' '}
              <span className="text-primary">
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
              className="bg-surface border border-border text-primary p-2 pr-12 font-mono text-sm w-full focus:outline-none focus:border-muted transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary border-l border-border pl-2">SOL</span>
          </div>

          {tab === 'limit' && (
            <div className="relative">
              <input
                type="text"
                placeholder="0.00"
                value={limitPriceVal}
                onChange={e => setLimitPriceVal(e.target.value)}
                className="bg-surface border border-border text-primary p-2 pr-12 font-mono text-sm w-full focus:outline-none focus:border-muted transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary border-l border-border pl-2">USD</span>
            </div>
          )}

          <div className="pt-6 pb-4">
            <div className="relative flex items-center group">
              <div className="absolute left-[8px] right-[8px] flex justify-between pointer-events-none z-0">
                {[0, 25, 50, 75, 100].map(v => (
                  <div
                    key={v}
                    className={`w-2.5 h-2.5 rounded-full border-[2.5px] bg-background transition-colors ${
                      v <= sliderVal[0] ? 'border-primary' : 'border-muted'
                    }`}
                  />
                ))}
              </div>

              <Slider
                value={sliderVal}
                onValueChange={(val: any) => setSliderVal(Array.isArray(val) ? val : [val])}
                max={100}
                step={1}
                className="relative z-10 w-full cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex space-x-3">
          <button
            onClick={() => handleOrder('bid')}
            disabled={!connected || loading}
            className="flex-1 bg-bid hover:bg-bid-hover text-white font-sans font-medium py-2 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Buy'}
          </button>
          <button
            onClick={() => handleOrder('ask')}
            disabled={!connected || loading}
            className="flex-1 bg-ask hover:bg-ask-hover text-white font-sans font-medium py-2 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Sell'}
          </button>
        </div>


        <div className="mt-auto pt-4 border-t border-border space-y-0">
          {tab === 'market' && (
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <span className="text-xs text-muted font-sans">Slippage Tolerance</span>
              <div className="flex items-center space-x-1">
                {SLIPPAGE_PRESETS.map(p => (
                  <button
                    key={p}
                    onClick={() => { setSlippage(p); setCustomSlippage(''); }}
                    className={`px-2 py-0.5 text-[10px] font-mono border transition-colors ${slippage === p && !customSlippage ? 'border-primary text-primary' : 'border-border text-muted hover:text-primary'}`}
                  >
                    {p}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="Custom"
                  value={customSlippage}
                  onChange={e => { setCustomSlippage(e.target.value); setSlippage(''); }}
                  className="w-14 px-2 py-0.5 text-[10px] font-mono border border-border bg-surface text-primary focus:outline-none focus:border-primary transition-colors placeholder:text-muted"
                />
              </div>
            </div>
          )}

          {tab === 'limit' && (
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <span className="text-xs text-muted font-sans">Time in Force</span>
              <div className="flex items-center space-x-1">
                {['GTC', 'IOC', 'FOK'].map(tif => (
                  <button key={tif} className="px-2 py-0.5 text-[10px] font-mono border border-border text-muted hover:text-primary hover:border-primary transition-colors first:border-primary first:text-primary">
                    {tif}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted font-sans">Order Value</span>
              <span className="text-primary">{orderValueUSD > 0 ? `$${fp(orderValueUSD)}` : '$0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-sans">{tab === 'market' ? 'Est. Fill Price' : 'Limit Price'}</span>
              <span className="text-primary">
                {tab === 'market'
                  ? estFillBid && estFillAsk
                    ? `$${fp(estFillBid)} / $${fp(estFillAsk)}`
                    : midPrice
                      ? `$${fp(midPrice)}`
                      : '—'
                  : limitPriceVal
                    ? `$${fp(parseFloat(limitPriceVal))}`
                    : '—'
                }
              </span>
            </div>
            {tab === 'market' && (
              <div className="flex justify-between">
                <span className="text-muted font-sans">Slippage</span>
                <span className="text-bid">{slippagePct}%</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted font-sans">{tab === 'market' ? 'Taker Fee (0.25%)' : 'Maker Fee (0.10%)'}</span>
              <span className="text-primary">
                {orderValueUSD > 0
                  ? `$${(tab === 'market' ? feeUSD : makerFeeUSD).toFixed(4)}`
                  : '$0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted font-sans">Network Fee</span>
              <span className="text-primary">~$0.01</span>
            </div>
            {tab === 'market' && (
              <div className="flex justify-between">
                <span className="text-muted font-sans">Min Received</span>
                <span className="text-primary">
                  {sizeInSol > 0 ? `${(sizeInSol * (1 - slippagePct / 100)).toFixed(4)} SOL` : '—'}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted font-sans font-semibold">Total Cost</span>
              <span className="text-primary font-semibold">
                {orderValueUSD > 0
                  ? `$${fp(orderValueUSD + (tab === 'market' ? feeUSD : makerFeeUSD) + 0.01)}`
                  : '$0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
