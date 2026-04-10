import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

export const CLUSTER = "devnet";

export const CONNECTION = new Connection(clusterApiUrl(CLUSTER), "confirmed");

export const PROGRAM_ID = new PublicKey(
  "H19wJgpk4kMbVqTa8XiwRQ5CipTKwsjHAWViHZRazJRZ",
);

export const BASE_MINT = new PublicKey(
  "12KFT8391vptEKjGKNWk4LhQm8jAXnFq427FHJ812vrh",
);

export const QUOTE_MINT = new PublicKey(
  "EtZbvEjCjwAmhmmBg84qC4S5Hw1GsdaTNGV3CuyjZQcR",
);

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
