"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { matchOrder, type Side } from "../match-order";

interface UseMatchOrderState {
  loading: boolean;
  error: string | null;
  signature: string | null;
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
      setState(s => ({ ...s, error: "Wallet not connected" }));
      return;
    }

    setState({ loading: true, error: null, signature: null });

    try {
      const { signature } = await matchOrder({ side, size, limitPrice, wallet });
      setState({ loading: false, error: null, signature });
    } catch (err) {
      setState({ loading: false, error: (err as Error).message, signature: null });
    }
  }

  return { ...state, submit };
}
