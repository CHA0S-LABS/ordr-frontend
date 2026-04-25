export interface WsOrderbook {
  asks: { price: number; size: number }[];
  bids: { price: number; size: number }[];
  mid: number | null;
}

export interface WsTrade {
  id: number;
  price: number;
  size: number;
  side: "bid" | "ask";
  taker: string;
  created_at: string;
}

export type WsMessage =
  | { type: "orderbook"; data: WsOrderbook }
  | { type: "trade"; data: WsTrade };

type Listener = (msg: WsMessage) => void;

const listeners = new Set<Listener>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getBackendWsUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
  return base.replace(/^https/, "wss").replace(/^http/, "ws") + "/ws";
}

export function connectWs() {
  if (typeof window === "undefined") return;
  if (ws && ws.readyState < WebSocket.CLOSING) return;

  ws = new WebSocket(getBackendWsUrl());

  ws.onmessage = (e) => {
    try {
      const msg: WsMessage = JSON.parse(e.data);
      listeners.forEach((l) => l(msg));
    } catch {}
  };

  ws.onclose = () => {
    reconnectTimer = setTimeout(() => {
      ws = null;
      connectWs();
    }, 2000);
  };

  ws.onerror = () => ws?.close();
}

export function subscribeWs(fn: Listener): () => void {
  listeners.add(fn);
  connectWs();
  return () => listeners.delete(fn);
}
