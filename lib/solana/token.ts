import { getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { BASE_MINT, QUOTE_MINT } from "../chain-config";

export async function getTakerATAs(walletPubkey: PublicKey): Promise<{
  baseAta: PublicKey;
  quoteAta: PublicKey;
}> {
  const [baseAta, quoteAta] = await Promise.all([
    getAssociatedTokenAddress(BASE_MINT, walletPubkey),
    getAssociatedTokenAddress(QUOTE_MINT, walletPubkey),
  ]);

  return { baseAta, quoteAta };
}
