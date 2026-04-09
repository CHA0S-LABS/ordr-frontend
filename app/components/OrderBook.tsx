import React from 'react';

const fp = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fs = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
  return n.toFixed(2);
};

const OrderRow = ({
  price,
  size,
  sum,
  type,
  maxSum,
}: {
  price: number;
  size: number;
  sum: number;
  type: 'ask' | 'bid';
  maxSum: number;
}) => {
  const depthPercentage = (sum / maxSum) * 100;
  const isAsk = type === 'ask';
  const colorClass = isAsk ? 'text-ask' : 'text-bid';
  const bgClass = isAsk ? 'bg-ask' : 'bg-bid';

  return (
    <div className="relative flex justify-between px-2 lg:px-4 py-0.5 text-xs font-mono tabular-nums leading-tight hover:bg-surface-hover cursor-pointer transition-colors group">
      <div 
        className={`absolute inset-y-0 right-0 ${bgClass} opacity-15 dark:opacity-20`}
        style={{ width: `${depthPercentage}%` }}
      />
      
      <div className={`z-10 w-1/3 text-left ${colorClass}`}>{fp(price)}</div>
      <div className="z-10 w-1/3 text-right text-primary">{fs(size)}</div>
      <div className="z-10 w-1/3 text-right text-primary">{fs(sum)}</div>
    </div>
  );
};

export default function OrderBook() {
  const asks = [
    { price: 150.12, size: 50090 },
    { price: 150.11, size: 303890 },
    { price: 150.10, size: 83490 },
    { price: 150.08, size: 50090 },
    { price: 150.07, size: 33390 },
    { price: 150.06, size: 50090 },
    { price: 150.05, size: 16700 },
    { price: 150.04, size: 33390 },
    { price: 150.03, size: 16700 },
    { price: 150.02, size: 116880 },
    { price: 150.01, size: 33390 },
    { price: 150.00, size: 897590 },
  ].reverse();

  const bids = [
    { price: 149.99, size: 544230 },
    { price: 149.98, size: 16700 },
    { price: 149.97, size: 233740 },
    { price: 149.96, size: 50090 },
    { price: 149.95, size: 33390 },
    { price: 149.94, size: 16700 },
    { price: 149.93, size: 166950 },
    { price: 149.92, size: 16700 },
    { price: 149.91, size: 16700 },
    { price: 149.90, size: 250430 },
    { price: 149.88, size: 66780 },
    { price: 149.85, size: 801300 },
  ];

  let currentAskSum = 0;
  const asksWithSum = asks.map(ask => {
    currentAskSum += ask.size;
    return { ...ask, sum: currentAskSum };
  }).reverse();

  let currentBidSum = 0;
  const bidsWithSum = bids.map(bid => {
    currentBidSum += bid.size;
    return { ...bid, sum: currentBidSum };
  });

  const maxSum = Math.max(
    asksWithSum.length ? asksWithSum[0].sum : 0, 
    bidsWithSum.length ? bidsWithSum[bidsWithSum.length - 1].sum : 0
  );

  return (
    <div className="flex flex-col h-full overflow-hidden w-full bg-background transition-colors">
      <div className="h-16 flex items-end border-b border-border px-2 lg:px-4">
        <button className="text-primary font-sans font-medium text-sm pb-2 border-b-2 border-primary mr-6 transition-colors">
          Book
        </button>
        <button className="text-muted hover:text-primary font-sans text-sm pb-2 border-b-2 border-transparent transition-colors">
          Trades
        </button>
      </div>

      <div className="flex justify-between items-center px-2 lg:px-4 py-2 border-b border-border transition-colors">
        <div className="flex space-x-2.5">
           <button className="flex flex-col space-y-0.5 w-4 h-4 justify-center items-center hover:opacity-80 transition-opacity">
             <div className="w-3.5 h-1bg-none border-b-2 border-ask"></div>
             <div className="w-3.5 h-1bg-none border-b-2 border-bid"></div>
           </button>
           <button className="w-4 h-4 flex items-center justify-center hover:opacity-80 transition-opacity">
             <div className="w-3.5 h-[5px] bg-bid"></div>
           </button>
           <button className="w-4 h-4 flex items-center justify-center hover:opacity-80 transition-opacity">
             <div className="w-3.5 h-[5px] bg-ask"></div>
           </button>
        </div>
        <div className="text-xs flex items-center space-x-1 cursor-pointer group">
          <span className="font-semibold text-primary transition-colors group-hover:text-muted">USD</span>
          <span className="text-muted transition-colors">|</span>
          <span className="text-primary transition-colors group-hover:text-muted">0.1</span>
          <svg className="w-3.5 h-3.5 text-muted ml-0.5 transition-colors group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div className="flex justify-between px-2 lg:px-4 py-2 border-b border-border text-[11px] font-sans text-muted transition-colors">
        <div className="w-1/3 text-left">Price</div>
        <div className="w-1/3 text-right">Size</div>
        <div className="w-1/3 text-right">Total</div>
      </div>
      
      <div className="flex-1 overflow-y-auto hide-scrollbar py-2 flex flex-col justify-center">
        <div className="flex flex-col">
          {asksWithSum.map((ask, i) => (
            <OrderRow 
              key={`ask-${i}`} 
              price={ask.price} 
              size={ask.size} 
              sum={ask.sum} 
              type="ask" 
              maxSum={maxSum} 
            />
          ))}
        </div>

        <div className="py-2 flex items-center px-2 lg:px-4 my-1 border-y border-transparent transition-colors">
          <div className="text-bid text-lg font-mono flex items-center mr-3 font-semibold">
            150.00 <span className="ml-1 text-base font-bold">↑</span>
          </div>
          <div className="text-xs text-primary font-sans mr-auto truncate transition-colors">$150.00</div>
          <div className="text-xs text-primary font-sans font-medium transition-colors flex items-center space-x-1">
            <span>0.0067%</span>
            <svg className="w-3.5 h-3.5 text-muted rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col">
          {bidsWithSum.map((bid, i) => (
            <OrderRow 
              key={`bid-${i}`} 
              price={bid.price} 
              size={bid.size} 
              sum={bid.sum} 
              type="bid" 
              maxSum={maxSum} 
            />
          ))}
        </div>
      </div>

      <div className="px-2 lg:px-4 py-3 mt-auto border-t border-border flex flex-col justify-center shrink-0 transition-colors">
        <div className="flex justify-between text-xs font-mono mb-1">
           <span className="text-bid font-medium">Buy 57.00%</span>
           <span className="text-ask font-medium">43.00% Sell</span>
        </div>
        <div className="w-full h-1.5 flex rounded-sm overflow-hidden bg-surface">
           <div className="h-full bg-bid" style={{ width: '57%' }}></div>
           <div className="h-full bg-ask opacity-80" style={{ width: '43%' }}></div>
        </div>
      </div>
    </div>
  );
}
