"use client";

import { useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useOrderbook, type RawPriceLevel } from "../hooks/useOrderbook";

const PRICE_SCALE = 1_000_000;
const SIZE_SCALE  = 1_000_000_000;

const PAD_L = 58, PAD_R = 10, PAD_T = 32, PAD_B = 28;
const GRID_ROWS = 4;

interface Point { price: number; cumSize: number }

function buildCurve(levels: RawPriceLevel[], ascending: boolean): Point[] {
  const sorted = [...levels].sort((a, b) => ascending ? a.price - b.price : b.price - a.price);
  let cum = 0;
  return sorted.map(l => {
    cum += l.size / SIZE_SCALE;
    return { price: l.price / PRICE_SCALE, cumSize: cum };
  });
}

function stepPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  toX: (p: number) => number,
  toY: (s: number) => number,
  fill: boolean
) {
  if (points.length === 0) return;
  ctx.beginPath();
  if (fill) ctx.moveTo(toX(points[0].price), toY(0));
  else ctx.moveTo(toX(points[0].price), toY(points[0].cumSize));

  if (fill) ctx.lineTo(toX(points[0].price), toY(points[0].cumSize));

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(toX(points[i].price), toY(points[i - 1].cumSize));
    ctx.lineTo(toX(points[i].price), toY(points[i].cumSize));
  }

  if (fill) {
    ctx.lineTo(toX(points[points.length - 1].price), toY(0));
    ctx.closePath();
  }
}

export default function DepthChart() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { asks, bids } = useOrderbook();
  const { resolvedTheme } = useTheme();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dark = resolvedTheme !== "light";
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const bg        = dark ? "#131614" : "#faf9f6";
    const gridColor = dark ? "#1f2421" : "#ebe8e2";
    const textColor = dark ? "#8a9490" : "#8a8580";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // bidCurve: desc by price → [0] = best bid (highest, near center)
    // reversed to ascending (left→right) for step drawing
    const bidCurve = buildCurve(bids, false).reverse();
    // askCurve: asc by price → [0] = best ask (lowest, near center)
    const askCurve = buildCurve(asks, true);

    if (bidCurve.length === 0 && askCurve.length === 0) {
      ctx.fillStyle = textColor;
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("No data", W / 2, H / 2);
      return;
    }

    const allPrices = [...bidCurve, ...askCurve].map(p => p.price);
    const allSizes  = [...bidCurve, ...askCurve].map(p => p.cumSize);
    const minPrice  = Math.min(...allPrices);
    const maxPrice  = Math.max(...allPrices);
    const maxSize   = Math.max(...allSizes);

    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    const toX = (price: number) => PAD_L + ((price - minPrice) / (maxPrice - minPrice || 1)) * plotW;
    const toY = (size: number)  => PAD_T + plotH - (size / (maxSize || 1)) * plotH;

    // Horizontal grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_ROWS; i++) {
      const y = PAD_T + (plotH / GRID_ROWS) * i;
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    }

    // Spread + dashed midline
    const bestBid = bidCurve.length > 0 ? bidCurve[bidCurve.length - 1].price : 0;
    const bestAsk = askCurve.length > 0 ? askCurve[0].price : 0;
    if (bestBid > 0 && bestAsk > 0) {
      const mid = (bestBid + bestAsk) / 2;
      const spread = bestAsk - bestBid;
      const spreadPct = mid > 0 ? (spread / mid * 100).toFixed(3) : '0.000';

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = dark ? 'rgba(138,148,144,0.3)' : 'rgba(138,133,128,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(toX(mid), PAD_T);
      ctx.lineTo(toX(mid), H - PAD_B);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = textColor;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Spread: ${spread.toFixed(5)}  (${spreadPct}%)`, W / 2, 16);
    }

    // Bid fill + line
    if (bidCurve.length > 0) {
      stepPath(ctx, bidCurve, toX, toY, true);
      const bidGrad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + plotH);
      bidGrad.addColorStop(0, "rgba(10,153,129,0.35)");
      bidGrad.addColorStop(1, "rgba(10,153,129,0.04)");
      ctx.fillStyle = bidGrad;
      ctx.fill();

      ctx.strokeStyle = "#0a9981";
      ctx.lineWidth = 1.5;
      stepPath(ctx, bidCurve, toX, toY, false);
      ctx.stroke();
    }

    // Ask fill + line
    if (askCurve.length > 0) {
      stepPath(ctx, askCurve, toX, toY, true);
      const askGrad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + plotH);
      askGrad.addColorStop(0, "rgba(242,52,68,0.35)");
      askGrad.addColorStop(1, "rgba(242,52,68,0.04)");
      ctx.fillStyle = askGrad;
      ctx.fill();

      ctx.strokeStyle = "#f23444";
      ctx.lineWidth = 1.5;
      stepPath(ctx, askCurve, toX, toY, false);
      ctx.stroke();
    }

    // X-axis price labels
    ctx.fillStyle = textColor;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const priceSteps = 6;
    for (let i = 0; i <= priceSteps; i++) {
      const price = minPrice + ((maxPrice - minPrice) / priceSteps) * i;
      ctx.fillText(price.toFixed(3), toX(price), H - 8);
    }

    // Y-axis size labels on LEFT
    ctx.textAlign = 'left';
    for (let i = 0; i <= GRID_ROWS; i++) {
      const size  = (maxSize / GRID_ROWS) * (GRID_ROWS - i);
      const y     = PAD_T + (plotH / GRID_ROWS) * i + 4;
      const label = size >= 1000 ? `${(size / 1000).toFixed(1)}K` : size.toFixed(1);
      ctx.fillText(label, 4, y);
    }
  }, [bids, asks, resolvedTheme]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas  = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !tooltip) return;

    const rect  = canvas.getBoundingClientRect();
    const mx    = e.clientX - rect.left;
    const W     = canvas.clientWidth;
    const plotW = W - PAD_L - PAD_R;

    const bidCurve = buildCurve(bids, false).reverse();
    const askCurve = buildCurve(asks, true);
    const allPrices = [...bidCurve, ...askCurve].map(p => p.price);
    if (allPrices.length === 0) { tooltip.style.display = "none"; return; }

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const price    = minPrice + ((mx - PAD_L) / plotW) * (maxPrice - minPrice);
    const mid      = (minPrice + maxPrice) / 2;

    const curve = price < mid ? bidCurve : askCurve;
    if (curve.length === 0) { tooltip.style.display = "none"; return; }

    const closest = curve.reduce((best, p) =>
      Math.abs(p.price - price) < Math.abs(best.price - price) ? p : best,
      curve[0]
    );
    if (!closest) { tooltip.style.display = "none"; return; }

    const isBid = price < mid;
    const bestBid = bidCurve.length > 0 ? bidCurve[bidCurve.length - 1].price : mid;
    const bestAsk = askCurve.length > 0 ? askCurve[0].price : mid;
    const realMid = (bestBid + bestAsk) / 2;
    const rangePct = realMid > 0 ? (Math.abs(closest.price - realMid) / realMid * 100).toFixed(2) : "0.00";
    const notional = (closest.price * closest.cumSize).toLocaleString("en-US", { maximumFractionDigits: 2 });
    const rangeColor = isBid ? "#0a9981" : "#f23444";

    const dark = resolvedTheme !== "light";
    const tint  = isBid ? (dark ? 'rgba(10,153,129,0.08)' : 'rgba(10,153,129,0.06)')
                        : (dark ? 'rgba(242,52,68,0.08)'  : 'rgba(242,52,68,0.06)');
    const tipBg     = dark ? `rgba(19,22,20,0.72)` : `rgba(250,249,246,0.78)`;
    const tipBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)';
    const labelClr  = dark ? "#8a9490" : "#8a8580";
    const valueClr  = dark ? "#e8e4dc" : "#1a1916";

    tooltip.style.display = "block";
    tooltip.style.left = `${Math.min(mx + 14, W - 170)}px`;
    tooltip.style.top  = `${Math.max(PAD_T + 4, e.clientY - rect.top - 10)}px`;
    tooltip.style.background = `${tipBg}`;
    tooltip.style.backgroundImage = `linear-gradient(135deg, ${tint}, ${tint})`;
    tooltip.style.backdropFilter = 'blur(12px)';
    (tooltip.style as any).WebkitBackdropFilter = 'blur(12px)';
    tooltip.style.border = `1px solid ${tipBorder}`;
    tooltip.innerHTML = `
      <table style="border-collapse:collapse;width:100%">
        <tr>
          <td style="color:${labelClr};font-size:11px;padding:2px 8px 2px 0;white-space:nowrap">Price</td>
          <td style="color:${valueClr};font-size:11px;font-family:monospace;text-align:right;white-space:nowrap">$${closest.price.toFixed(3)}</td>
        </tr>
        <tr>
          <td style="color:${labelClr};font-size:11px;padding:2px 8px 2px 0;white-space:nowrap">Cum. Size</td>
          <td style="color:${valueClr};font-size:11px;font-family:monospace;text-align:right;white-space:nowrap">${closest.cumSize.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="color:${labelClr};font-size:11px;padding:2px 8px 2px 0;white-space:nowrap">Notional</td>
          <td style="color:${valueClr};font-size:11px;font-family:monospace;text-align:right;white-space:nowrap">$${notional}</td>
        </tr>
        <tr>
          <td style="color:${labelClr};font-size:11px;padding:2px 0 0 0;white-space:nowrap">Range</td>
          <td style="color:${rangeColor};font-size:11px;font-family:monospace;text-align:right;font-weight:600;white-space:nowrap">+${rangePct}%</td>
        </tr>
      </table>
    `;
  }, [bids, asks, resolvedTheme]);

  const handleMouseLeave = () => {
    if (tooltipRef.current) tooltipRef.current.style.display = "none";
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      <div
        ref={tooltipRef}
        style={{
          display: "none",
          position: "absolute",
          pointerEvents: "none",
          zIndex: 10,
          borderRadius: 10,
          padding: "10px 12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.04) inset",
          minWidth: 156,
        }}
      />
    </div>
  );
}
