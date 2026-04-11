import { Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
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

export async function matchOrder(params: MatchOrderParams): Promise<MatchOrderResult> {
  const { side, size, limitPrice, wallet } = params;

  if (!wallet.publicKey) throw new Error("Wallet not connected");
  if (!wallet.signTransaction) throw new Error("Wallet does not support signing");

  const { baseAta, quoteAta } = await getTakerATAs(wallet.publicKey);

  const [baseInfo, quoteInfo] = await Promise.all([
    CONNECTION.getAccountInfo(baseAta),
    CONNECTION.getAccountInfo(quoteAta),
  ]);

  const setupIxs = [];
  if (!baseInfo) {
    setupIxs.push(createAssociatedTokenAccountInstruction(
      wallet.publicKey, baseAta, wallet.publicKey, BASE_MINT
    ));
  }
  if (!quoteInfo) {
    setupIxs.push(createAssociatedTokenAccountInstruction(
      wallet.publicKey, quoteAta, wallet.publicKey, QUOTE_MINT
    ));
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

  const { transaction: base64Tx } = await res.json();

  if (!base64Tx) throw new Error("No transaction returned — no liquidity or price outside limit");

  const txBytes = Buffer.from(base64Tx, "base64");
  const tx = Transaction.from(txBytes);

  const signedTx = await wallet.signTransaction(tx);

  const signature = await sendWithRetry(signedTx.serialize());
  await CONNECTION.confirmTransaction(signature, "confirmed");

  return { signature };
}

async function sendWithRetry(rawTx: Buffer | Uint8Array): Promise<string> {
  try {
    return await CONNECTION.sendRawTransaction(rawTx, { skipPreflight: false });
  } catch (e: any) {
    const msg: string = e?.message ?? "";
    if (msg.includes("already been processed") || msg.includes("AlreadyProcessed")) {
      const match = msg.match(/([1-9A-HJ-NP-Za-km-z]{87,88})/);
      if (match) return match[1];
    }
    throw e;
  }
}
