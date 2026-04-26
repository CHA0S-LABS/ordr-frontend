<div align="center">

<img src="assets/logo.png" alt="ordr.trade" width="160" />

# ordr-frontend

The trading UI for [ordr.trade](https://ordr.trade) - a fully on-chain CLOB on Solana.

[Website](https://ordr.trade) &nbsp;&middot;&nbsp; [X / Twitter](https://x.com/ordrtrade)

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square)
![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?style=flat-square)

</div>

## Overview

Real-time taker interface for the ordr on-chain orderbook. Connects to a Solana wallet, displays the live order book and price chart, and submits market orders through the backend.

Part of the ordr ecosystem - see [ordr](https://github.com/ordrdottrade/ordr) for the on-chain program that this UI settles against.

Built by Chaos Labs.

<div align="center">

[@4rjunc](https://x.com/4rjunc) &nbsp;&middot;&nbsp; [@avhidotsol](https://x.com/avhidotsol) &nbsp;&middot;&nbsp; [@boomheadvt](https://x.com/boomheadvt) &nbsp;&middot;&nbsp; [@Vinayapr23](https://x.com/Vinayapr23)

</div>

## How orders work

1. User enters a size and clicks **Buy** or **Sell**
2. Frontend calls `POST /match_order` on the backend with side, size, and a slippage-adjusted limit price
3. Backend returns a base64-encoded unsigned transaction
4. Frontend decodes it, requests wallet signature, and submits to Solana
5. Settlement happens on-chain in the ordr program

## Related repos

- [ordr](https://github.com/ordrdottrade/ordr) - on-chain program
- [ordr-backend](https://github.com/ordrdottrade/ordr-backend) - indexer + REST API
- [ordr-market-maker](https://github.com/ordrdottrade/ordr-market-maker) - MM bot that places and reprices quotes
