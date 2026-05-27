"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import type { IChartingLibraryWidget, ChartingLibraryWidgetOptions, ResolutionString } from "charting_library";
import { datafeed } from "@/lib/datafeed";

type ChartView = 'chart' | 'depth';

declare global {
  interface Window {
    TradingView: {
      widget: new (options: ChartingLibraryWidgetOptions) => IChartingLibraryWidget;
    };
  }
}

const SCRIPT_ID = "tv-charting-library";
let _scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (_scriptPromise) return _scriptPromise;
  _scriptPromise = new Promise((resolve, reject) => {
    if (window.TradingView?.widget) { resolve(); return; }
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = "/charting_library/charting_library.standalone.js";
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _scriptPromise;
}

function getBg(dark: boolean) {
  return dark ? "#131614" : "#faf9f6";
}

function getOverrides(dark: boolean) {
  return {
    "paneProperties.background": getBg(dark),
    "paneProperties.backgroundType": "solid" as const,
    "paneProperties.vertGridProperties.color": dark ? "#1f2421" : "#ebe8e2",
    "paneProperties.horzGridProperties.color": dark ? "#1f2421" : "#ebe8e2",
    "scalesProperties.textColor": dark ? "#8a9490" : "#8a8580",
    "scalesProperties.lineColor": dark ? "#2c3330" : "#d4d0c9",
    "mainSeriesProperties.candleStyle.upColor": "#0a9981",
    "mainSeriesProperties.candleStyle.downColor": "#f23444",
    "mainSeriesProperties.candleStyle.wickUpColor": "#0a9981",
    "mainSeriesProperties.candleStyle.wickDownColor": "#f23444",
    "mainSeriesProperties.candleStyle.borderUpColor": "#0a9981",
    "mainSeriesProperties.candleStyle.borderDownColor": "#f23444",
    "mainSeriesProperties.candleStyle.drawWick": true,
    "mainSeriesProperties.candleStyle.drawBorder": true,
  };
}

function injectBg(container: HTMLElement, bg: string) {
  const iframe = container.querySelector('iframe');
  if (!iframe?.contentDocument?.head) return;
  const doc = iframe.contentDocument;
  let el = doc.getElementById('ordr-bg') as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = 'ordr-bg';
    doc.head.appendChild(el);
  }
  el.textContent = `body,.chart-controls-bar,#footer-chart-panel,[class*="drawingToolbar"],[class*="wrap-"],[class*="inner-"]{background-color:${bg} !important}`;
}

function injectFooterToggle(
  container: HTMLElement,
  view: ChartView,
  dark: boolean,
  onChange: (v: ChartView) => void,
  chartBtnRef: React.MutableRefObject<HTMLElement | null>,
  depthBtnRef: React.MutableRefObject<HTMLElement | null>,
) {
  const iframe = container.querySelector('iframe') as HTMLIFrameElement | null;
  if (!iframe?.contentDocument) return;
  const doc = iframe.contentDocument;
  const footer = doc.getElementById('footer-chart-panel');
  if (!footer) return;

  if (doc.getElementById('ordr-view-toggle')) return;

  const wrap = doc.createElement('div');
  wrap.id = 'ordr-view-toggle';
  wrap.style.cssText = 'display:inline-flex;align-items:center;height:100%;padding:0 6px 0 2px;gap:1px;';

  const makeBtn = (v: ChartView, label: string) => {
    const btn = doc.createElement('button');
    btn.textContent = label;
    const active = view === v;
    btn.style.cssText = [
      'padding:1px 8px',
      'border-radius:3px',
      'font-size:12px',
      'cursor:pointer',
      'border:none',
      'outline:none',
      'font-family:inherit',
      `background:${active ? (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)') : 'transparent'}`,
      `color:${active ? (dark ? '#e8e4dc' : '#1a1916') : (dark ? '#8a9490' : '#8a8580')}`,
      `font-weight:${active ? '600' : '400'}`,
      'transition:all 0.15s ease',
    ].join(';');
    btn.addEventListener('click', () => onChange(v));
    if (v === 'chart') chartBtnRef.current = btn;
    else depthBtnRef.current = btn;
    return btn;
  };

  wrap.appendChild(makeBtn('chart', 'Chart'));
  wrap.appendChild(makeBtn('depth', 'Depth'));
  footer.insertBefore(wrap, footer.firstChild);
}

export default function Chart({
  symbol,
  chartView = 'chart',
  onViewChange,
}: {
  symbol: string;
  chartView?: ChartView;
  onViewChange?: (v: ChartView) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<IChartingLibraryWidget | null>(null);
  const { resolvedTheme } = useTheme();
  const chartBtnRef = useRef<HTMLElement | null>(null);
  const depthBtnRef = useRef<HTMLElement | null>(null);
  const onViewChangeRef = useRef(onViewChange);
  const chartViewRef = useRef(chartView);

  useEffect(() => { onViewChangeRef.current = onViewChange; }, [onViewChange]);

  const syncBtnStyles = useCallback((view: ChartView, dark: boolean) => {
    [
      { el: chartBtnRef.current, active: view === 'chart' },
      { el: depthBtnRef.current, active: view === 'depth' },
    ].forEach(({ el, active }) => {
      if (!el) return;
      el.style.background = active
        ? (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)')
        : 'transparent';
      el.style.color = active
        ? (dark ? '#e8e4dc' : '#1a1916')
        : (dark ? '#8a9490' : '#8a8580');
      el.style.fontWeight = active ? '600' : '400';
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const dark = document.documentElement.classList.contains("dark");
    let cancelled = false;
    chartBtnRef.current = null;
    depthBtnRef.current = null;

    loadScript().then(() => {
      if (cancelled || !container) return;

      widgetRef.current?.remove();

      const w = new window.TradingView.widget({
        container,
        datafeed,
        symbol,
        interval: "5" as ResolutionString,
        library_path: "/charting_library/",
        locale: "en",
        fullscreen: false,
        autosize: true,
        theme: dark ? "dark" : "light",
        loading_screen: { backgroundColor: getBg(dark) },
        timezone: "Etc/UTC",
        volumePaneSize: "small" as never,
        disabled_features: [
          "header_symbol_search",
          "header_compare",
          "go_to_date",
          "display_market_status",
          "symbol_info",
        ],
        enabled_features: ["side_toolbar_in_fullscreen_mode"],
        overrides: getOverrides(dark),
      } as ChartingLibraryWidgetOptions);

      w.onChartReady(() => {
        w.applyOverrides(getOverrides(dark));
        w.setCSSCustomProperty('--tv-color-platform-background', getBg(dark));
        w.setCSSCustomProperty('--color-bg-primary', getBg(dark));
        w.setCSSCustomProperty('--tv-color-pane-background', getBg(dark));
        injectBg(container, getBg(dark));

        if (onViewChangeRef.current) {
          setTimeout(() => {
            if (cancelled) return;
            injectFooterToggle(
              container,
              chartViewRef.current,
              dark,
              v => onViewChangeRef.current?.(v),
              chartBtnRef,
              depthBtnRef,
            );
            syncBtnStyles(chartViewRef.current, dark);
          }, 300);
        }
      });

      widgetRef.current = w;
    });

    return () => {
      cancelled = true;
      widgetRef.current?.remove();
      widgetRef.current = null;
      chartBtnRef.current = null;
      depthBtnRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, syncBtnStyles]);

  useEffect(() => {
    chartViewRef.current = chartView;
    syncBtnStyles(chartView, resolvedTheme !== 'light');
  }, [chartView, resolvedTheme, syncBtnStyles]);

  useEffect(() => {
    if (!resolvedTheme || !widgetRef.current || !containerRef.current) return;
    const dark = resolvedTheme !== "light";
    const container = containerRef.current;
    widgetRef.current
      .changeTheme(dark ? "dark" : "light")
      .then(() => {
        widgetRef.current?.applyOverrides(getOverrides(dark));
        widgetRef.current?.setCSSCustomProperty('--tv-color-platform-background', getBg(dark));
        widgetRef.current?.setCSSCustomProperty('--color-bg-primary', getBg(dark));
        widgetRef.current?.setCSSCustomProperty('--tv-color-pane-background', getBg(dark));
        injectBg(container, getBg(dark));
        syncBtnStyles(chartViewRef.current, dark);
      })
      .catch(() => {});
  }, [resolvedTheme, syncBtnStyles]);

  return <div ref={containerRef} className="w-full h-full" />;
}
