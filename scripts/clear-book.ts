import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";

const RPC_URL =
  "https://devnet.helius-rpc.com/?api-key=e3c410a6-6c04-4320-b010-29a4d3c6e878";
const PROGRAM_ID = new PublicKey(
  "H19wJgpk4kMbVqTa8XiwRQ5CipTKwsjHAWViHZRazJRZ",
);
const BASE_MINT = new PublicKey("hKwwi3aPDT6oBtLuSRzmL9ZECntXX3WopnWJi2uS6ez");
const QUOTE_MINT = new PublicKey(
  "AFj6Eq85uFcsq2YdnKgvAHo4ie384m7QxUyzvTjtB1t2",
);
const BACKEND_URL = "http://localhost:8080";

const CLEAR_SIDE: Record<string, number> = { bid: 0, ask: 1, both: 2 };

async function main() {
  const sideIdx = process.argv.indexOf("--side");
  const sideArg = sideIdx !== -1 ? process.argv[sideIdx + 1] : "both";
  const sideVal = CLEAR_SIDE[sideArg];
  if (sideVal === undefined) {
    throw new Error(`Unknown --side value "${sideArg}". Use bid | ask | both`);
  }

  const conn = new Connection(RPC_URL, "confirmed");
  const authority = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf-8"),
      ),
    ),
  );

  console.log("Authority:", authority.publicKey.toBase58());
  console.log("Clearing: ", sideArg);

  const res = await fetch(`${BACKEND_URL}/makers`);
  const markets: any[] = await res.json();
  const cfg = markets.find(
    (m) =>
      m.base_mint === BASE_MINT.toBase58() &&
      m.quote_mint === QUOTE_MINT.toBase58(),
  );
  if (!cfg) throw new Error("Market not found. Is the backend running?");

  const market = new PublicKey(cfg.market_address);
  const bid = new PublicKey(cfg.bid_address);
  const ask = new PublicKey(cfg.ask_address);

  console.log("Market:", market.toBase58());

  const data = Buffer.alloc(2);
  data.writeUInt8(7, 0);
  data.writeUInt8(sideVal, 1);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: false },
      { pubkey: ask, isSigner: false, isWritable: true },
      { pubkey: bid, isSigner: false, isWritable: true },
    ],
    data,
  });

  const sig = await sendAndConfirmTransaction(
    conn,
    new Transaction().add(ix),
    [authority],
    {
      commitment: "confirmed",
    },
  );

  console.log(`✓ Book cleared (${sideArg})  tx: ${sig}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
