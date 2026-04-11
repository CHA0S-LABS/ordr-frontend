import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
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

const CANCEL_THRESHOLD = 84;
const CANCEL_COUNT = 2;

const intervalIdx = process.argv.indexOf("--interval");
const intervalArg = intervalIdx !== -1 ? process.argv[intervalIdx + 1] : "30";
const INTERVAL_MS = parseInt(intervalArg) * 1000;

const BID_LEVELS: [number, number][] = [
  [-1, 100],
  [-2, 150],
  [-3, 80],
  [-4, 120],
  [-5, 60],
  [-6, 50],
  [-7, 90],
  [-8, 110],
  [-9, 70],
  [-10, 40],
];

const ASK_LEVELS: [number, number][] = [
  [1, 100],
  [2, 150],
  [3, 80],
  [4, 120],
  [5, 60],
  [6, 50],
  [7, 90],
  [8, 110],
  [9, 70],
  [10, 40],
];

function buildPlaceIx(
  authority: PublicKey,
  market: PublicKey,
  ask: PublicKey,
  bid: PublicKey,
  baseVault: PublicKey,
  quoteVault: PublicKey,
  baseAta: PublicKey,
  quoteAta: PublicKey,
  offset: bigint,
  side: 0 | 1,
  size: bigint,
): TransactionInstruction {
  const data = Buffer.alloc(18);
  data.writeUInt8(1, 0);
  data.writeBigInt64LE(offset, 1);
  data.writeUInt8(side, 9);
  data.writeBigUInt64LE(size, 10);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: false },
      { pubkey: ask, isSigner: false, isWritable: true },
      { pubkey: bid, isSigner: false, isWritable: true },
      { pubkey: baseVault, isSigner: false, isWritable: true },
      { pubkey: quoteVault, isSigner: false, isWritable: true },
      { pubkey: baseAta, isSigner: false, isWritable: true },
      { pubkey: quoteAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildCancelIx(
  authority: PublicKey,
  market: PublicKey,
  bid: PublicKey,
  ask: PublicKey,
  baseVault: PublicKey,
  quoteVault: PublicKey,
  baseAta: PublicKey,
  quoteAta: PublicKey,
  orderId: bigint,
  side: 0 | 1,
): TransactionInstruction {
  const data = Buffer.alloc(10);
  data.writeUInt8(2, 0);
  data.writeBigUInt64LE(orderId, 1);
  data.writeUInt8(side, 9);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: false },
      { pubkey: bid, isSigner: false, isWritable: true },
      { pubkey: ask, isSigner: false, isWritable: true },
      { pubkey: baseVault, isSigner: false, isWritable: true },
      { pubkey: quoteVault, isSigner: false, isWritable: true },
      { pubkey: baseAta, isSigner: false, isWritable: true },
      { pubkey: quoteAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

interface OrderRow {
  order_id: number;
  side: string;
  offset: number;
  size: number;
  filled_size: number;
}

async function fetchActiveOrders(): Promise<OrderRow[]> {
  const res = await fetch(`${BACKEND_URL}/orders`);
  return res.json();
}

async function main() {
  const conn = new Connection(RPC_URL, "confirmed");
  const authority = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf-8"),
      ),
    ),
  );

  console.log("Authority:", authority.publicKey.toBase58());
  console.log("Interval: ", INTERVAL_MS / 1000, "s");

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
  const baseVault = new PublicKey(cfg.base_vault);
  const quoteVault = new PublicKey(cfg.quote_vault);
  const [baseAta, quoteAta] = await Promise.all([
    getAssociatedTokenAddress(BASE_MINT, authority.publicKey),
    getAssociatedTokenAddress(QUOTE_MINT, authority.publicKey),
  ]);

  console.log("Market:", market.toBase58());

  let idx = 0;

  const placeOrders = async () => {
    console.log(`\n[${new Date().toLocaleTimeString()}] cycle=${idx}`);

    const active = await fetchActiveOrders();
    const bids = active.filter((o) => o.side === "bid");
    const asks = active.filter((o) => o.side === "ask");
    console.log(`  Active: ${bids.length} bids, ${asks.length} asks`);

    if (bids.length + asks.length >= CANCEL_THRESHOLD) {
      console.log(
        `  ⚡ Threshold hit — cancelling ${CANCEL_COUNT} worst per side`,
      );

      const bidsToCancel = bids.slice(0, CANCEL_COUNT);
      const asksToCancel = asks.slice(0, CANCEL_COUNT);

      for (const order of bidsToCancel) {
        try {
          const ix = buildCancelIx(
            authority.publicKey,
            market,
            bid,
            ask,
            baseVault,
            quoteVault,
            baseAta,
            quoteAta,
            BigInt(order.order_id),
            0,
          );
          await sendAndConfirmTransaction(
            conn,
            new Transaction().add(ix),
            [authority],
            { commitment: "confirmed" },
          );
          console.log(
            `  ✓ cancelled bid #${order.order_id} offset=${order.offset}`,
          );
        } catch (e: any) {
          console.log(
            `  ✗ cancel bid #${order.order_id}: ${e?.message?.slice(0, 80)}`,
          );
        }
      }

      for (const order of asksToCancel) {
        try {
          const ix = buildCancelIx(
            authority.publicKey,
            market,
            bid,
            ask,
            baseVault,
            quoteVault,
            baseAta,
            quoteAta,
            BigInt(order.order_id),
            1,
          );
          await sendAndConfirmTransaction(
            conn,
            new Transaction().add(ix),
            [authority],
            { commitment: "confirmed" },
          );
          console.log(
            `  ✓ cancelled ask #${order.order_id} offset=${order.offset}`,
          );
        } catch (e: any) {
          console.log(
            `  ✗ cancel ask #${order.order_id}: ${e?.message?.slice(0, 80)}`,
          );
        }
      }
    }

    const [bidOffset, bidSize] = BID_LEVELS[idx % BID_LEVELS.length];
    const [askOffset, askSize] = ASK_LEVELS[idx % ASK_LEVELS.length];
    console.log(`  Placing bid offset=${bidOffset}, ask offset=+${askOffset}`);

    try {
      if (bids.length < 86) {
        const ix = buildPlaceIx(
          authority.publicKey,
          market,
          ask,
          bid,
          baseVault,
          quoteVault,
          baseAta,
          quoteAta,
          BigInt(bidOffset),
          0,
          BigInt(bidSize),
        );
        const sig = await sendAndConfirmTransaction(
          conn,
          new Transaction().add(ix),
          [authority],
          { commitment: "confirmed" },
        );
        console.log(
          `  ✓ bid offset=${bidOffset} size=${bidSize}  (${sig.slice(0, 16)}...)`,
        );
      }
    } catch (e: any) {
      console.log(`  ✗ bid offset=${bidOffset}: ${e?.message}`);
    }

    try {
      if (asks.length < 86) {
        const ix = buildPlaceIx(
          authority.publicKey,
          market,
          ask,
          bid,
          baseVault,
          quoteVault,
          baseAta,
          quoteAta,
          BigInt(askOffset),
          1,
          BigInt(askSize),
        );
        const sig = await sendAndConfirmTransaction(
          conn,
          new Transaction().add(ix),
          [authority],
          { commitment: "confirmed" },
        );
        console.log(
          `  ✓ ask offset=+${askOffset} size=${askSize}  (${sig.slice(0, 16)}...)`,
        );
      }
    } catch (e: any) {
      console.log(`  ✗ ask offset=+${askOffset}: ${e?.message}`);
    }

    idx++;
  };

  await placeOrders();
  setInterval(placeOrders, INTERVAL_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
