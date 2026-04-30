# Superteam submission: Raydium CPMM Arbitrage Monitor

Listing: https://superteam.fun/earn/listing/create-an-open-source-real-time-arbitrage-monitoring-tool-for-raydium-cpmm

Repository: https://github.com/agamal026/raydium-cpmm-arb-monitor

## Short submission text

Built a read-only CLI monitor for Raydium CPMM/standard pool arbitrage opportunities.

It accepts two mint addresses, discovers Raydium standard pools for the pair, continuously polls live pool data, normalizes spot prices, ranks buy/sell cross-pool spreads, and computes estimated net profit after both pool fees and configurable transaction-cost bps. It supports JSON output, structured timestamped logs, .env/CLI configuration, optional RPC health checks, and includes tests for price normalization, config parsing, and opportunity scoring.

Safety: monitor-only; it never asks for private keys, never signs transactions, and never performs swaps.

Verification run locally:
- `npm install`
- `npm test` → 5/5 tests passing
- `node dist/src/index.js --once --json --page-size 10 --min-profit-bps -10000` → live Raydium API snapshot collected successfully

## Notes for final submitter

- The listing is marked regional: Ukraine only.
- Superteam requires login before submission.
- Final submission should be made from the operator's own eligible Superteam account/session.
