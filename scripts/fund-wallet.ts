import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import fs from "fs";
import os from "os";

const BASE_MINT = new PublicKey("hKwwi3aPDT6oBtLuSRzmL9ZECntXX3WopnWJi2uS6ez");
const QUOTE_MINT = new PublicKey(
  "AFj6Eq85uFcsq2YdnKgvAHo4ie384m7QxUyzvTjtB1t2",
);
const RPC_URL = "https://api.devnet.solana.com";
const AMOUNT = 1_000_000n;

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: npx tsx scripts/fund-wallet.ts <WALLET>");
    process.exit(1);
  }

  const conn = new Connection(RPC_URL, "confirmed");
  const payer = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf-8"),
      ),
    ),
  );
  const wallet = new PublicKey(target);

  console.log("Funding:", wallet.toBase58());

  for (const [label, mint] of [
    ["BASE", BASE_MINT],
    ["QUOTE", QUOTE_MINT],
  ] as const) {
    const ata = await getAssociatedTokenAddress(mint, wallet);
    const info = await conn.getAccountInfo(ata);

    const tx = new Transaction();
    if (!info)
      tx.add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          ata,
          wallet,
          mint,
        ),
      );
    tx.add(createMintToInstruction(mint, ata, payer.publicKey, AMOUNT));

    await sendAndConfirmTransaction(conn, tx, [payer], {
      commitment: "confirmed",
    });
    console.log(`${label} ATA: ${ata.toBase58()}  (+1,000,000)`);
  }

  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
