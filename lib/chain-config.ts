import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

export const CLUSTER = "devnet";

export const CONNECTION = new Connection(clusterApiUrl(CLUSTER), "confirmed");

export const PROGRAM_ID = new PublicKey(
  "H19wJgpk4kMbVqTa8XiwRQ5CipTKwsjHAWViHZRazJRZ",
);

export const BASE_MINT = new PublicKey(
  "hKwwi3aPDT6oBtLuSRzmL9ZECntXX3WopnWJi2uS6ez",
);

export const QUOTE_MINT = new PublicKey(
  "AFj6Eq85uFcsq2YdnKgvAHo4ie384m7QxUyzvTjtB1t2",
);

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
