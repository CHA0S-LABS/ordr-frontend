"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export default function Chart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme || !containerRef.current) return;

    const el = containerRef.current;

    el.style.transition = 'opacity 0.15s ease';
    el.style.opacity = '0';

    const timeout = setTimeout(() => {
      el.innerHTML = '';

      const wrapper = document.createElement('div');
      wrapper.style.height = '100%';
      wrapper.style.width = '100%';

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol,
        interval: '5',
        timezone: 'Etc/UTC',
        theme: resolvedTheme === 'light' ? 'light' : 'dark',
        style: '1',
        locale: 'en',
        backgroundColor: resolvedTheme === 'light' ? '#ffffff' : '#000000',
        gridColor: resolvedTheme === 'light' ? '#e5e5e5' : '#1a1a1a',
        hide_top_toolbar: true,
        hide_legend: false,
        hide_side_toolbar: true,
        allow_symbol_change: false,
        save_image: false,
        calendar: false,
        support_host: 'https://www.tradingview.com',
      });

      wrapper.appendChild(script);
      el.appendChild(wrapper);

      setTimeout(() => {
        el.style.opacity = '1';
      }, 800);
    }, 150);

    return () => clearTimeout(timeout);
  }, [resolvedTheme, symbol]);

  return <div ref={containerRef} className="w-full h-full" />;
}
