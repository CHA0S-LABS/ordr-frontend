import { Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
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

  const { baseAta, quoteAta } = await getTakerATAs(wallet.publicKey);

  const [baseInfo, quoteInfo] = await Promise.all([
    CONNECTION.getAccountInfo(baseAta),
    CONNECTION.getAccountInfo(quoteAta),
  ]);

  const setupIxs = [];
  if (!baseInfo) {
    setupIxs.push(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        baseAta,
        wallet.publicKey,
        BASE_MINT,
      ),
    );
  }
  if (!quoteInfo) {
    setupIxs.push(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        quoteAta,
        wallet.publicKey,
        QUOTE_MINT,
      ),
    );
  }

  if (setupIxs.length > 0) {
    const setupTx = new Transaction().add(...setupIxs);
    setupTx.recentBlockhash = (await CONNECTION.getLatestBlockhash()).blockhash;
    setupTx.feePayer = wallet.publicKey;
    const signedSetup = await wallet.signTransaction(setupTx);
    const setupSig = await sendWithRetry(signedSetup.serialize());
    await CONNECTION.confirmTransaction(setupSig, "confirmed");
  }

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

  const { transaction: base64Tx, price: fillPrice, size: fillSize, side: fillSide } = await res.json();

  if (!base64Tx)
    throw new Error(
      "No transaction returned — no liquidity or price outside limit",
    );

  const txBytes = Buffer.from(base64Tx, "base64");
  const tx = Transaction.from(txBytes);

  const signedTx = await wallet.signTransaction(tx);

  // derive the txid from the signature bytes before sending — this is always correct
  const sigBytes = signedTx.signatures[0]?.signature;
  const knownSig = sigBytes ? bs58.encode(sigBytes) : null;

  const signature = await sendWithRetry(signedTx.serialize(), knownSig);
  if (signature !== knownSig) {
    // different sig means it wasn't the "already processed" path — confirm normally
    await CONNECTION.confirmTransaction(signature, "confirmed");
  }

  // Record trade only after on-chain confirmation
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
      // tx already landed — use the sig we computed from the signed bytes
      const match = msg.match(/([1-9A-HJ-NP-Za-km-z]{87,88})/);
      if (match) return match[1];
      if (fallbackSig) return fallbackSig;
      throw e;
    }
    throw e;
  }
}
