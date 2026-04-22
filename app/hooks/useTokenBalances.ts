"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { CONNECTION } from "@/lib/chain-config";
import { getTakerATAs } from "@/lib/solana/token";

export interface TokenBalances {
  baseBalance: number | null;
  quoteBalance: number | null;
}

export function useTokenBalances(): TokenBalances {
  const { publicKey, connected } = useWallet();
  const [baseBalance, setBaseBalance] = useState<number | null>(null);
  const [quoteBalance, setQuoteBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey || !connected) {
      setBaseBalance(null);
      setQuoteBalance(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const { baseAta, quoteAta } = await getTakerATAs(publicKey);
        const [base, quote] = await Promise.all([
          CONNECTION.getTokenAccountBalance(baseAta).catch(() => null),
          CONNECTION.getTokenAccountBalance(quoteAta).catch(() => null),
        ]);
        if (!cancelled) {
          setBaseBalance(base ? Number(base.value.amount) : 0);
          setQuoteBalance(quote ? Number(quote.value.amount) : 0);
        }
      } catch {}
    };

    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [publicKey, connected]);

  return { baseBalance, quoteBalance };
}
