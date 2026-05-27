import type {
  IBasicDataFeed,
  LibrarySymbolInfo,
  ResolutionString,
  SearchSymbolResultItem,
  Bar,
  SubscribeBarsCallback,
  OnReadyCallback,
  ResolveCallback,
  DatafeedErrorCallback,
  HistoryCallback,
  PeriodParams,
} from "charting_library";

const CC = "https://min-api.cryptocompare.com/data/v2";

type CCEndpoint = "histominute" | "histohour" | "histoday";

interface ResolutionConfig {
  endpoint: CCEndpoint;
  aggregate: number;
  intervalMs: number;
}

const RESOLUTION_CONFIG: Record<string, ResolutionConfig> = {
  "1":   { endpoint: "histominute", aggregate: 1,  intervalMs: 60_000 },
  "3":   { endpoint: "histominute", aggregate: 3,  intervalMs: 180_000 },
  "5":   { endpoint: "histominute", aggregate: 5,  intervalMs: 300_000 },
  "15":  { endpoint: "histominute", aggregate: 15, intervalMs: 900_000 },
  "30":  { endpoint: "histominute", aggregate: 30, intervalMs: 1_800_000 },
  "60":  { endpoint: "histohour",   aggregate: 1,  intervalMs: 3_600_000 },
  "120": { endpoint: "histohour",   aggregate: 2,  intervalMs: 7_200_000 },
  "240": { endpoint: "histohour",   aggregate: 4,  intervalMs: 14_400_000 },
  "1D":  { endpoint: "histoday",    aggregate: 1,  intervalMs: 86_400_000 },
  "1W":  { endpoint: "histoday",    aggregate: 7,  intervalMs: 604_800_000 },
};

const QUOTES = ["USDT", "USDC", "BUSD", "BTC", "ETH", "BNB", "USD"];

function splitSymbol(sym: string): { base: string; quote: string } {
  for (const q of QUOTES) {
    if (sym.endsWith(q)) return { base: sym.slice(0, -q.length), quote: q };
  }
  return { base: sym, quote: "USD" };
}

interface CCBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volumefrom: number;
}

async function fetchBars(
  sym: string,
  resolution: string,
  toTs: number,
  limit: number
): Promise<Bar[]> {
  const cfg = RESOLUTION_CONFIG[resolution] ?? RESOLUTION_CONFIG["5"];
  const { base, quote } = splitSymbol(sym);
  const params = new URLSearchParams({
    fsym: base,
    tsym: quote,
    limit: String(limit),
    toTs: String(Math.floor(toTs)),
    aggregate: String(cfg.aggregate),
  });
  const res = await fetch(`${CC}/${cfg.endpoint}?${params}`);
  const json = await res.json();
  if (json.Response !== "Success") return [];
  return (json.Data.Data as CCBar[]).map((b) => ({
    time: b.time * 1000,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volumefrom,
  }));
}

const subs = new Map<string, ReturnType<typeof setInterval>>();

export const datafeed: IBasicDataFeed = {
  onReady(callback: OnReadyCallback) {
    setTimeout(() =>
      callback({
        supported_resolutions: ["1", "3", "5", "15", "30", "60", "120", "240", "1D", "1W"] as ResolutionString[],
        exchanges: [{ value: "CC", name: "CryptoCompare", desc: "CryptoCompare" }],
        symbols_types: [{ name: "crypto", value: "crypto" }],
      })
    , 0);
  },

  searchSymbols(
    _userInput: string,
    _exchange: string,
    _symbolType: string,
    onResult: (items: SearchSymbolResultItem[]) => void
  ) {
    onResult([]);
  },

  resolveSymbol(
    symbolName: string,
    onResolve: ResolveCallback,
    _onError: DatafeedErrorCallback
  ) {
    const name = symbolName.toUpperCase().replace(/^[^:]+:/, "");
    const { base, quote } = splitSymbol(name);
    setTimeout(() =>
      onResolve({
        name,
        description: `${base} / ${quote}`,
        type: "crypto",
        session: "24x7",
        exchange: "CryptoCompare",
        listed_exchange: "CryptoCompare",
        timezone: "Etc/UTC",
        format: "price",
        pricescale: 100,
        minmov: 1,
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        supported_resolutions: ["1", "3", "5", "15", "30", "60", "120", "240", "1D", "1W"] as ResolutionString[],
        volume_precision: 2,
        data_status: "streaming",
      })
    , 0);
  },

  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: DatafeedErrorCallback
  ) {
    const { to, countBack } = periodParams;
    const limit = Math.min(countBack, 2000);
    fetchBars(symbolInfo.name, resolution, to, limit)
      .then((bars) => {
        if (bars.length === 0) { onResult([], { noData: true }); return; }
        onResult(bars, { noData: false });
      })
      .catch((err) => onError(String(err)));
  },

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: SubscribeBarsCallback,
    subscriberUID: string
  ) {
    const cfg = RESOLUTION_CONFIG[resolution] ?? RESOLUTION_CONFIG["5"];
    const pollInterval = Math.max(cfg.intervalMs / 6, 10_000);

    const poll = async () => {
      try {
        const bars = await fetchBars(symbolInfo.name, resolution, Date.now() / 1000, 2);
        if (bars.length > 0) onTick(bars[bars.length - 1]);
      } catch { /* ignore poll errors */ }
    };

    poll();
    subs.set(subscriberUID, setInterval(poll, pollInterval));
  },

  unsubscribeBars(subscriberUID: string) {
    const timer = subs.get(subscriberUID);
    if (timer !== undefined) { clearInterval(timer); subs.delete(subscriberUID); }
  },
};
