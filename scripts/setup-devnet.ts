/**
 * setup-devnet.ts — Full devnet bootstrap for Ordr.
 *
 * Creates mints, ATAs, market, and places test orders.
 *
 * Usage:
 *   npx tsx scripts/setup-devnet.ts
 *
 * Requires: ~/.config/solana/id.json  (funded devnet keypair)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeAccountInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
  ACCOUNT_SIZE,
} from "@solana/spl-token";
import fs from "fs";
import os from "os";

// ── Config ────────────────────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("H19wJgpk4kMbVqTa8XiwRQ5CipTKwsjHAWViHZRazJRZ");
const RPC_URL    = "https://api.devnet.solana.com";

const TICK_SIZE  = 1n;
const LOT_SIZE   = 1n;
const MID_PRICE  = 150n;
const CAPACITY   = 16;

// Slab: 32-byte header + capacity * (16 inner + 88 leaf) bytes
const SLAB_SIZE  = 32 + CAPACITY * 104;
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  // Load keypair
  const kpPath = `${os.homedir()}/.config/solana/id.json`;
  const authority = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(kpPath, "utf-8")))
  );
  console.log("Authority:", authority.publicKey.toBase58());

  const bal = await connection.getBalance(authority.publicKey);
  console.log("Balance:  ", (bal / 1e9).toFixed(4), "SOL");
  if (bal < 1e9) throw new Error("Need at least 1 SOL on devnet. Run: solana airdrop 5");

  // ── Step 1: Create mints ───────────────────────────────────────────────────
  console.log("\n[1] Creating mints (0 decimals)...");

  const baseMintKp  = Keypair.generate();
  const quoteMintKp = Keypair.generate();

  await createMint(connection, authority, baseMintKp);
  await createMint(connection, authority, quoteMintKp);

  console.log("Base mint: ", baseMintKp.publicKey.toBase58());
  console.log("Quote mint:", quoteMintKp.publicKey.toBase58());

  // ── Step 2: Create ATAs and mint tokens ───────────────────────────────────
  console.log("\n[2] Minting tokens to authority...");

  const baseAta  = await createAtaAndMint(connection, authority, baseMintKp.publicKey,  1_000_000n);
  const quoteAta = await createAtaAndMint(connection, authority, quoteMintKp.publicKey, 1_000_000n);

  console.log("Base ATA: ", baseAta.toBase58(), "(1,000,000)");
  console.log("Quote ATA:", quoteAta.toBase58(), "(1,000,000)");

  // ── Step 3: Derive market PDA ─────────────────────────────────────────────
  const [marketPda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("market"),
      baseMintKp.publicKey.toBuffer(),
      quoteMintKp.publicKey.toBuffer(),
      authority.publicKey.toBuffer(),
    ],
    PROGRAM_ID
  );
  console.log("\n[3] Market PDA:", marketPda.toBase58(), "  bump:", bump);

  // ── Step 4: Create slab accounts (owner = program) ────────────────────────
  console.log("\n[4] Creating bid/ask slab accounts...");

  const bidKp = Keypair.generate();
  const askKp = Keypair.generate();

  await createProgramOwnedAccount(connection, authority, bidKp, SLAB_SIZE);
  await createProgramOwnedAccount(connection, authority, askKp, SLAB_SIZE);

  console.log("Bid slab:", bidKp.publicKey.toBase58());
  console.log("Ask slab:", askKp.publicKey.toBase58());

  // ── Step 5: Create vault token accounts (authority = market PDA) ──────────
  console.log("\n[5] Creating vault accounts...");

  const baseVaultKp  = Keypair.generate();
  const quoteVaultKp = Keypair.generate();

  await createVault(connection, authority, baseVaultKp,  baseMintKp.publicKey,  marketPda);
  await createVault(connection, authority, quoteVaultKp, quoteMintKp.publicKey, marketPda);

  console.log("Base vault: ", baseVaultKp.publicKey.toBase58());
  console.log("Quote vault:", quoteVaultKp.publicKey.toBase58());

  // ── Step 6: Create market ─────────────────────────────────────────────────
  console.log("\n[6] Creating market...");

  // Layout: [disc(1)][tick_size(8)][lot_size(8)][mid_price(8)][bump(1)][pad(7)] = 33 bytes
  const ixData = Buffer.alloc(33);
  ixData.writeUInt8(0, 0);                    // discriminator
  ixData.writeBigUInt64LE(TICK_SIZE,  1);
  ixData.writeBigUInt64LE(LOT_SIZE,   9);
  ixData.writeBigUInt64LE(MID_PRICE, 17);
  ixData.writeUInt8(bump, 25);
  // bytes 26-33: zero padding

  const createMarketIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey,       isSigner: true,  isWritable: true  },
      { pubkey: marketPda,                 isSigner: false, isWritable: true  },
      { pubkey: baseMintKp.publicKey,      isSigner: false, isWritable: false },
      { pubkey: quoteMintKp.publicKey,     isSigner: false, isWritable: false },
      { pubkey: baseVaultKp.publicKey,     isSigner: false, isWritable: false },
      { pubkey: quoteVaultKp.publicKey,    isSigner: false, isWritable: false },
      { pubkey: bidKp.publicKey,           isSigner: false, isWritable: true  },
      { pubkey: askKp.publicKey,           isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId,   isSigner: false, isWritable: false },
    ],
    data: ixData,
  });

  const sig = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(createMarketIx),
    [authority],
    { commitment: "confirmed" }
  );
  console.log("Market created! Tx:", sig);

  // ── Step 7: Place test orders ─────────────────────────────────────────────
  console.log("\n[7] Placing test orders (mid=150, tick=1)...");

  // BID offset=-2 → price=148, size=100  (locks 148*100=14,800 quote)
  await placeOrder(connection, authority, marketPda,
    askKp.publicKey, bidKp.publicKey,
    baseVaultKp.publicKey, quoteVaultKp.publicKey,
    baseAta, quoteAta,
    -2n, 0, 100n);
  console.log("  BID offset=-2 price=148 size=100");

  // BID offset=-5 → price=145, size=200  (locks 145*200=29,000 quote)
  await placeOrder(connection, authority, marketPda,
    askKp.publicKey, bidKp.publicKey,
    baseVaultKp.publicKey, quoteVaultKp.publicKey,
    baseAta, quoteAta,
    -5n, 0, 200n);
  console.log("  BID offset=-5 price=145 size=200");

  // ASK offset=+3 → price=153, size=150  (locks 150 base)
  await placeOrder(connection, authority, marketPda,
    askKp.publicKey, bidKp.publicKey,
    baseVaultKp.publicKey, quoteVaultKp.publicKey,
    baseAta, quoteAta,
    3n, 1, 150n);
  console.log("  ASK offset=+3 price=153 size=150");

  // ASK offset=+7 → price=157, size=50   (locks 50 base)
  await placeOrder(connection, authority, marketPda,
    askKp.publicKey, bidKp.publicKey,
    baseVaultKp.publicKey, quoteVaultKp.publicKey,
    baseAta, quoteAta,
    7n, 1, 50n);
  console.log("  ASK offset=+7 price=157 size=50");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
========================================
  Setup Complete
========================================
Program ID:   ${PROGRAM_ID.toBase58()}
Market PDA:   ${marketPda.toBase58()}
Base mint:    ${baseMintKp.publicKey.toBase58()}
Quote mint:   ${quoteMintKp.publicKey.toBase58()}
Bid slab:     ${bidKp.publicKey.toBase58()}
Ask slab:     ${askKp.publicKey.toBase58()}
Base vault:   ${baseVaultKp.publicKey.toBase58()}
Quote vault:  ${quoteVaultKp.publicKey.toBase58()}

Orderbook:
  Bids: 148 x100, 145 x200
  Asks: 153 x150, 157 x50

Add to ordr-backend/.env:
PROGRAM_ID=${PROGRAM_ID.toBase58()}
BASE_MINT=${baseMintKp.publicKey.toBase58()}
QUOTE_MINT=${quoteMintKp.publicKey.toBase58()}

Add to f/lib/chain-config.ts:
PROGRAM_ID = "${PROGRAM_ID.toBase58()}"
BASE_MINT  = "${baseMintKp.publicKey.toBase58()}"
QUOTE_MINT = "${quoteMintKp.publicKey.toBase58()}"
`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createMint(conn: Connection, payer: Keypair, mintKp: Keypair) {
  const rent = await conn.getMinimumBalanceForRentExemption(MINT_SIZE);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKp.publicKey,
      lamports: rent,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mintKp.publicKey, 0, payer.publicKey, null)
  );
  await sendAndConfirmTransaction(conn, tx, [payer, mintKp], { commitment: "confirmed" });
}

async function createAtaAndMint(
  conn: Connection,
  authority: Keypair,
  mint: PublicKey,
  amount: bigint
): Promise<PublicKey> {
  const ata = await getAssociatedTokenAddress(mint, authority.publicKey);
  const tx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      authority.publicKey, ata, authority.publicKey, mint
    ),
    createMintToInstruction(mint, ata, authority.publicKey, amount)
  );
  await sendAndConfirmTransaction(conn, tx, [authority], { commitment: "confirmed" });
  return ata;
}

async function createProgramOwnedAccount(
  conn: Connection,
  payer: Keypair,
  account: Keypair,
  space: number
) {
  const rent = await conn.getMinimumBalanceForRentExemption(space);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: account.publicKey,
      lamports: rent,
      space,
      programId: PROGRAM_ID,
    })
  );
  await sendAndConfirmTransaction(conn, tx, [payer, account], { commitment: "confirmed" });
}

async function createVault(
  conn: Connection,
  payer: Keypair,
  vaultKp: Keypair,
  mint: PublicKey,
  vaultAuthority: PublicKey
) {
  const rent = await conn.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: vaultKp.publicKey,
      lamports: rent,
      space: ACCOUNT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeAccountInstruction(vaultKp.publicKey, mint, vaultAuthority)
  );
  await sendAndConfirmTransaction(conn, tx, [payer, vaultKp], { commitment: "confirmed" });
}

async function placeOrder(
  conn: Connection,
  authority: Keypair,
  market: PublicKey,
  ask: PublicKey,
  bid: PublicKey,
  baseVault: PublicKey,
  quoteVault: PublicKey,
  baseAta: PublicKey,
  quoteAta: PublicKey,
  offset: bigint,
  side: number,   // 0=bid, 1=ask
  size: bigint
) {
  // Layout (after discriminator): [offset(8)][side(1)][size(8)] = 17 bytes
  const data = Buffer.alloc(18);
  data.writeUInt8(1, 0);                    // discriminator
  data.writeBigInt64LE(offset, 1);
  data.writeUInt8(side, 9);
  data.writeBigUInt64LE(size, 10);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: market,              isSigner: false, isWritable: false },
      { pubkey: ask,                 isSigner: false, isWritable: true  },
      { pubkey: bid,                 isSigner: false, isWritable: true  },
      { pubkey: baseVault,           isSigner: false, isWritable: true  },
      { pubkey: quoteVault,          isSigner: false, isWritable: true  },
      { pubkey: baseAta,             isSigner: false, isWritable: true  },
      { pubkey: quoteAta,            isSigner: false, isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID,    isSigner: false, isWritable: false },
    ],
    data,
  });

  const sig = await sendAndConfirmTransaction(
    conn,
    new Transaction().add(ix),
    [authority],
    { commitment: "confirmed" }
  );
  console.log("    Tx:", sig);
}

main().catch((e) => { console.error(e); process.exit(1); });
