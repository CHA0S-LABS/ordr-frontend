import { Transaction, SystemProgram } from "@solana/web3.js";
import bs58 from "bs58";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";
import { getTakerATAs } from "./token";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { CONNECTION, BASE_MINT, QUOTE_MINT } from "../chain-config";

export type Side = "bid" | "ask";

export interface MatchOrderParams {
  side: Side;
  size: number;
  limitPrice?: number;
  wallet: WalletContextState;
}

export interface MatchOrderResult {
  signature: string;
}

export async function matchOrder(
  params: MatchOrderParams,
): Promise<MatchOrderResult> {
  const { side, size, limitPrice, wallet } = params;

  if (!wallet.publicKey) throw new Error("Wallet not connected");
  if (!wallet.signTransaction)
    throw new Error("Wallet does not support signing");
  if (!wallet.signAllTransactions)
    throw new Error("Wallet does not support signAllTransactions");

  const { baseAta, quoteAta } = await getTakerATAs(wallet.publicKey);

  const res = await fetch(`/api/match_order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      side,
      size,
      limit_price: limitPrice ?? null,
      taker: wallet.publicKey.toBase58(),
      taker_base_ata: baseAta.toBase58(),
      taker_quote_ata: quoteAta.toBase58(),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Backend error: ${err}`);
  }

  const {
    transaction: base64Tx,
    price: fillPrice,
    size: fillSize,
    side: fillSide,
  } = await res.json();

  if (!base64Tx)
    throw new Error(
      "No transaction returned — no liquidity or price outside limit",
    );

  const backendTx = Transaction.from(Buffer.from(base64Tx, "base64"));

  const { blockhash } = await CONNECTION.getLatestBlockhash();

  const tradeTx = new Transaction();
  tradeTx.recentBlockhash = blockhash;
  tradeTx.feePayer = wallet.publicKey;

  tradeTx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      baseAta,
      wallet.publicKey,
      BASE_MINT,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      quoteAta,
      wallet.publicKey,
      QUOTE_MINT,
    ),
  );

  if (side === "ask") {
    tradeTx.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: baseAta,
        lamports: size,
      }),
      createSyncNativeInstruction(baseAta),
    );
  }

  backendTx.instructions.forEach((ix) => tradeTx.add(ix));

  if (side === "bid") {
    tradeTx.add(
      createCloseAccountInstruction(
        baseAta,
        wallet.publicKey,
        wallet.publicKey,
      ),
    );
  }

  const simResult = await CONNECTION.simulateTransaction(tradeTx);
  if (simResult.value.err) {
    throw new Error(
      `Transaction simulation failed: ${JSON.stringify(simResult.value.err)}`,
    );
  }

  const [signedTrade] = await wallet.signAllTransactions([tradeTx]);

  const sigBytes = signedTrade.signatures[0]?.signature;
  const knownSig = sigBytes ? bs58.encode(sigBytes) : null;

  const signature = await sendWithRetry(signedTrade.serialize(), knownSig);
  await CONNECTION.confirmTransaction(signature, "confirmed");

  await fetch("/api/trades", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      price: fillPrice,
      size: fillSize,
      side: fillSide,
      taker: wallet.publicKey.toBase58(),
    }),
  });

  return { signature: signature === knownSig ? knownSig! : signature };
}

async function sendWithRetry(
  rawTx: Buffer | Uint8Array,
  fallbackSig?: string | null,
): Promise<string> {
  try {
    return await CONNECTION.sendRawTransaction(rawTx, { skipPreflight: false });
  } catch (e: any) {
    const msg: string = e?.message ?? "";
    if (
      msg.includes("already been processed") ||
      msg.includes("AlreadyProcessed")
    ) {
      const match = msg.match(/([1-9A-HJ-NP-Za-km-z]{87,88})/);
      if (match) return match[1];
      if (fallbackSig) return fallbackSig;
      throw e;
    }
    throw e;
  }
}
