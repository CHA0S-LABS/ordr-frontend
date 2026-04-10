/**
 * create-market.ts
 *
 * Creates a new market on devnet for the deployed Ordr program.
 *
 * Run:
 *   npx tsx scripts/create-market.ts
 *
 * Requires: ~/.config/solana/id.json (your devnet keypair with SOL)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createInitializeAccount3Instruction,
} from "@solana/spl-token";
import fs from "fs";
import os from "os";

// ── Config ────────────────────────────────────────────────────────────────────
const PROGRAM_ID  = new PublicKey("H19wJgpk4kMbVqTa8XiwRQ5CipTKwsjHAWViHZRazJRZ");
const BASE_MINT   = new PublicKey("GEjeUy1qKXga6qWryq4qhVUYM9vRMZMsgFvWQknuus77");
const QUOTE_MINT  = new PublicKey("H8zaJkqUaVrwCriWg9L9poa5oPhMCFFYtLWezqiAwPnP");
const RPC_URL     = "https://api.devnet.solana.com";

// Market params — adjust to match your existing order book data
const TICK_SIZE  = 1n;   // 1 unit per tick
const LOT_SIZE   = 1n;   // minimum order size
const MID_PRICE  = 150n; // starting mid price (match what's in DB)

// Slab size: 32 header + 90 * (16 inner + 88 leaf) = 9392 bytes
const CAPACITY  = 90;
const SLAB_SIZE = 32 + CAPACITY * (16 + 88);

// SPL token account size
const TOKEN_ACCOUNT_SIZE = 165;
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  // Load authority keypair
  const keypairPath = `${os.homedir()}/.config/solana/id.json`;
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const authority = Keypair.fromSecretKey(new Uint8Array(keypairData));
  console.log("Authority:", authority.publicKey.toBase58());

  // Derive market PDA: [b"market", base_mint, quote_mint, authority]
  const [marketPda, marketBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("market"),
      BASE_MINT.toBuffer(),
      QUOTE_MINT.toBuffer(),
      authority.publicKey.toBuffer(),
    ],
    PROGRAM_ID
  );
  console.log("Market PDA:", marketPda.toBase58(), "  bump:", marketBump);

  // Generate fresh keypairs for the pre-allocated accounts
  const bidKp        = Keypair.generate();
  const askKp        = Keypair.generate();
  const baseVaultKp  = Keypair.generate();
  const quoteVaultKp = Keypair.generate();

  console.log("Bid slab:   ", bidKp.publicKey.toBase58());
  console.log("Ask slab:   ", askKp.publicKey.toBase58());
  console.log("Base vault: ", baseVaultKp.publicKey.toBase58());
  console.log("Quote vault:", quoteVaultKp.publicKey.toBase58());

  const slabRent  = await connection.getMinimumBalanceForRentExemption(SLAB_SIZE);
  const vaultRent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);

  const tx = new Transaction();

  // 1. Allocate bid slab — owner = program
  tx.add(SystemProgram.createAccount({
    fromPubkey: authority.publicKey,
    newAccountPubkey: bidKp.publicKey,
    lamports: slabRent,
    space: SLAB_SIZE,
    programId: PROGRAM_ID,
  }));

  // 2. Allocate ask slab — owner = program
  tx.add(SystemProgram.createAccount({
    fromPubkey: authority.publicKey,
    newAccountPubkey: askKp.publicKey,
    lamports: slabRent,
    space: SLAB_SIZE,
    programId: PROGRAM_ID,
  }));

  // 3. Allocate + init base vault — owner = market PDA
  tx.add(SystemProgram.createAccount({
    fromPubkey: authority.publicKey,
    newAccountPubkey: baseVaultKp.publicKey,
    lamports: vaultRent,
    space: TOKEN_ACCOUNT_SIZE,
    programId: TOKEN_PROGRAM_ID,
  }));
  tx.add(createInitializeAccount3Instruction(
    baseVaultKp.publicKey,
    BASE_MINT,
    marketPda,
    TOKEN_PROGRAM_ID,
  ));

  // 4. Allocate + init quote vault — owner = market PDA
  tx.add(SystemProgram.createAccount({
    fromPubkey: authority.publicKey,
    newAccountPubkey: quoteVaultKp.publicKey,
    lamports: vaultRent,
    space: TOKEN_ACCOUNT_SIZE,
    programId: TOKEN_PROGRAM_ID,
  }));
  tx.add(createInitializeAccount3Instruction(
    quoteVaultKp.publicKey,
    QUOTE_MINT,
    marketPda,
    TOKEN_PROGRAM_ID,
  ));

  // 5. create_market instruction
  // Layout: [discriminator(1)][tick_size(8)][lot_size(8)][mid_price(8)][bump(1)][pad(7)]
  const ixData = Buffer.alloc(33);
  ixData.writeUInt8(0, 0);               // discriminator = 0
  ixData.writeBigUInt64LE(TICK_SIZE,  1);
  ixData.writeBigUInt64LE(LOT_SIZE,   9);
  ixData.writeBigUInt64LE(MID_PRICE, 17);
  ixData.writeUInt8(marketBump, 25);
  // bytes 26-32: zero padding

  tx.add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey,      isSigner: true,  isWritable: true  },
      { pubkey: marketPda,                isSigner: false, isWritable: true  },
      { pubkey: BASE_MINT,                isSigner: false, isWritable: false },
      { pubkey: QUOTE_MINT,               isSigner: false, isWritable: false },
      { pubkey: baseVaultKp.publicKey,    isSigner: false, isWritable: true  },
      { pubkey: quoteVaultKp.publicKey,   isSigner: false, isWritable: true  },
      { pubkey: bidKp.publicKey,          isSigner: false, isWritable: true  },
      { pubkey: askKp.publicKey,          isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false },
    ],
    data: ixData,
  }));

  console.log("\nSending transaction...");
  const sig = await sendAndConfirmTransaction(
    connection,
    tx,
    [authority, bidKp, askKp, baseVaultKp, quoteVaultKp],
    { commitment: "confirmed" }
  );

  console.log("\nMarket created! Signature:", sig);
  console.log("\n─── Save these in your DB / indexer config ──────────────────");
  console.log("MARKET_PDA: ", marketPda.toBase58());
  console.log("BID_SLAB:   ", bidKp.publicKey.toBase58());
  console.log("ASK_SLAB:   ", askKp.publicKey.toBase58());
  console.log("BASE_VAULT: ", baseVaultKp.publicKey.toBase58());
  console.log("QUOTE_VAULT:", quoteVaultKp.publicKey.toBase58());
  console.log("────────────────────────────────────────────────────────────");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
