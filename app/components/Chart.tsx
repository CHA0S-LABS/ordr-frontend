"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import type { IChartingLibraryWidget, ChartingLibraryWidgetOptions, ResolutionString } from "charting_library";
import { datafeed } from "@/lib/datafeed";

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
  el.textContent = `body,.chart-controls-bar,#footer-chart-panel,[class*="drawingToolbar"],[class*="inner-"]{background-color:${bg} !important}`;
}

export default function Chart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<IChartingLibraryWidget | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const dark = document.documentElement.classList.contains("dark");
    let cancelled = false;

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
      });

      widgetRef.current = w;
    });

    return () => {
      cancelled = true;
      widgetRef.current?.remove();
      widgetRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

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
      })
      .catch(() => {});
  }, [resolvedTheme]);

  return <div ref={containerRef} className="w-full h-full" />;
}
