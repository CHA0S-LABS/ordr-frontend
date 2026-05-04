"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { matchOrder, type Side } from "../match-order";

interface UseMatchOrderState {
  loading: boolean;
  error: string | null;
  signature: string | null;
}

function friendlyError(msg: string): string {
  if (msg.includes("insufficient funds") || msg.includes("0x1")) return "Insufficient funds.";
  if (msg.includes("no liquidity") || msg.includes("No transaction returned")) return "No liquidity available at this price.";
  if (msg.includes("price outside limit") || msg.includes("outside limit")) return "Price moved outside your slippage limit. Try again.";
  if (msg.includes("Wallet not connected")) return "Connect your wallet first.";
  if (msg.includes("User rejected")) return "Transaction rejected.";
  if (msg.includes("invalid account data")) return "Order failed — maker account not available. Try again.";
  return msg;
}

export function useMatchOrder() {
  const wallet = useWallet();
  const [state, setState] = useState<UseMatchOrderState>({
    loading: false,
    error: null,
    signature: null,
  });

  async function submit(side: Side, size: number, limitPrice?: number) {
    if (!wallet.connected) {
      toast.error("Wallet not connected");
      setState((s) => ({ ...s, error: "Wallet not connected" }));
      return;
    }

    if (state.loading) return;

    setState({ loading: true, error: null, signature: null });

    const toastId = toast.loading(
      side === "bid" ? "Submitting buy order..." : "Submitting sell order...",
    );

    try {
      const { signature } = await matchOrder({
        side,
        size,
        limitPrice,
        wallet,
      });

      toast.success(side === "bid" ? "Buy filled!" : "Sell filled!", {
        id: toastId,
        description: `${signature.slice(0, 8)}...`,
        action: {
          label: "Solscan",
          onClick: () =>
            window.open(
              `https://solscan.io/tx/${signature}?cluster=devnet`,
              "_blank",
            ),
        },
        duration: 8000,
      });

      setState({ loading: false, error: null, signature });
    } catch (err) {
      const raw = (err as Error).message ?? "Unknown error";

      if (
        raw.includes("already been processed") ||
        raw.includes("AlreadyProcessed")
      ) {
        toast.success(side === "bid" ? "Buy filled!" : "Sell filled!", {
          id: toastId,
          description: "Transaction confirmed.",
          duration: 6000,
        });
        setState({ loading: false, error: null, signature: null });
        return;
      }

      const friendly = friendlyError(raw);
      toast.error("Order failed", {
        id: toastId,
        description: friendly,
        duration: 6000,
      });
      setState({ loading: false, error: friendly, signature: null });
    }
  }

  return { ...state, submit };
}
