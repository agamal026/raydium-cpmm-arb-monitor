# Raydium CPMM Arbitrage Monitor

Read-only CLI monitor for Raydium CPMM/standard pool price discrepancies.

The tool does not trade, sign transactions, custody funds, or require private keys. It discovers Raydium standard/CPMM pools for a token pair, polls live pool data, normalizes prices into one base/quote direction, ranks cross-pool buy/sell spreads, and reports estimated net profit after pool fees and a configurable transaction-cost haircut.

Maintained by [agamal026](https://github.com/agamal026). See the
[changelog](CHANGELOG.md), [contribution guide](CONTRIBUTING.md), and
[security reporting policy](SECURITY.md). Support is best effort.

## Architecture

```text
CLI flags / .env
   -> config.ts validates options
   -> raydium.ts queries https://api-v3.raydium.io/pools/info/mint
   -> arbitrage.ts normalizes pool prices and scores all buy/sell combinations
   -> format.ts renders a table or JSON snapshot
```

Important design choices:

- Raydium API calls are read-only and use the public v3 endpoint.
- `--rpc-url` is optional and only used for a read-only `getHealth` check, so no private/keyed RPC URL is required.
- Pool price normalization is defensive: it uses Raydium's `price` field when valid and falls back to decimal reserve ratios from `mintAmountA` / `mintAmountB`.
- The monitor ranks opportunities but does not claim they are executable. Execution would still require route simulation, slippage modeling, liquidity depth, compute-unit costs, account creation costs, priority fees, and transaction landing checks.

## Installation

Use Node.js 22 or newer. CI runs the offline tests on Node.js 22 and 24 on
Linux and Windows. Tests use fixtures and a local HTTP server; they do not call
Raydium or a Solana RPC service.

```bash
git clone https://github.com/agamal026/raydium-cpmm-arb-monitor.git
cd raydium-cpmm-arb-monitor
npm ci
npm test
npm run build
```

For local development without building first:

```bash
npm run dev -- --once
```

After building:

```bash
npm start -- --once
```

## Configuration

Configuration can come from CLI flags or `.env`. CLI flags win over environment values.

Copy the example file:

```bash
cp .env.example .env
```

Supported options:

| CLI flag | Environment | Default | Description |
| --- | --- | --- | --- |
| `--mint-a` | `MINT_A` | Wrapped SOL | Base token mint |
| `--mint-b` | `MINT_B` | USDC | Quote token mint |
| `--amount` | `AMOUNT_BASE` | `1` | Base-token amount used for profit estimates |
| `--interval` | `POLL_INTERVAL_MS` | `10000` | Poll interval in milliseconds |
| `--min-profit-bps` | `MIN_PROFIT_BPS` | `5` | Minimum net-profit bps to display |
| `--tx-cost-bps` | `TX_COST_BPS` | `2` | Estimated transaction / priority-fee cost in bps |
| `--min-tvl-usd` | `MIN_TVL_USD` | `1000` | Ignore pools below this TVL to avoid dust-pool false positives |
| `--rpc-url` | `RPC_URL` | empty | Optional read-only RPC health check URL |
| `--page-size` | `PAGE_SIZE` | `100` | Raydium API page size |
| `--timeout-ms` | `TIMEOUT_MS` | `12000` | HTTP timeout through complete response-body consumption, per attempt |
| `--retries` | `RETRIES` | `2` | Raydium API retry count |
| `--json` | `JSON=true` | false | Emit JSON snapshots |
| `--once` | `ONCE=true` | false | Run one poll and exit |
| `--log-level` | `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error` |

Never commit private or keyed RPC URLs. If a URL includes a query key, runtime logs redact common `key`, `api_key`, and `token` query parameters.

This redaction is limited: review logs before sharing them, including URL
userinfo, paths, other query parameters, and provider error messages. RPC health
checks cap the configured timeout at five seconds. Discovery retries have a
separate deadline for each attempt and a backoff between attempts.

## Usage examples

Default SOL/USDC one-shot table:

```bash
npm run dev -- --once
```

SOL/USDC JSON snapshot:

```bash
npm run dev -- --once --json \
  --mint-a So11111111111111111111111111111111111111112 \
  --mint-b EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

Live polling every 5 seconds and only show opportunities above 10 net bps:

```bash
npm run dev -- \
  --mint-a So11111111111111111111111111111111111111112 \
  --mint-b EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --interval 5000 \
  --min-profit-bps 10 \
  --tx-cost-bps 3 \
  --min-tvl-usd 1000
```

Example table shape:

```text
Raydium CPMM/standard arbitrage monitor @ 2026-04-29T14:40:00.000Z
Pair: WSOL/USDC (So11…1112 -> EPjF…Dt1v), amountBase=1
Discovered pools: 10, opportunities: 1

Pools
pool          labels                 price(base->quote) fee_bps tvl_usd
58oQ…YQo2     Standard,Amm,OpenBook          84.13884677   25.00 7,433,835.92
...

Opportunities
net_bps gross_bps profit_quote buy_pool      sell_pool     buy_price sell_price
  12.43     64.43      0.104321 58oQ…YQo2    7xKX…abc1     84.1388    84.6810
```

## Calculation details

For each normalized pool, the monitor calculates:

```text
priceBaseInQuote = quote reserve / base reserve
```

When Raydium's `price` field is present and valid, it is used directly if the pool order is `base/quote`, or inverted when the returned pool order is `quote/base`. If `price` is missing, the monitor falls back to `mintAmountA` and `mintAmountB` reserve ratios.

For every ordered pair of pools:

```text
buyPrice = lower priceBaseInQuote pool
sellPrice = higher priceBaseInQuote pool

grossSpreadBps = ((sellPrice - buyPrice) / buyPrice) * 10_000
totalFeeBps = buyPoolFeeRate * 10_000 + sellPoolFeeRate * 10_000
netProfitBps = grossSpreadBps - totalFeeBps - txCostBps

grossProfitQuote = amountBase * (sellPrice - buyPrice)
feesQuote = amountBase * buyPrice * buyFeeRate + amountBase * sellPrice * sellFeeRate
txCostQuote = amountBase * buyPrice * (txCostBps / 10_000)
netProfitQuote = grossProfitQuote - feesQuote - txCostQuote
```

Only opportunities with `netProfitBps >= minProfitBps` are displayed.

## Limitations

This is a monitoring and research tool, not an execution bot. Reported opportunities are not guaranteed to be fillable. Before any real trade, a production system would need at least:

- Quote simulation for exact input/output amounts.
- Slippage and liquidity-depth modeling.
- Pool account freshness checks from RPC.
- Priority fee and compute-unit estimation.
- Atomic route construction and preflight.
- Transaction landing and reorg handling.
- Balance, token-account, and rent checks.
- Risk limits and audit logs.

## Project history

The initial version was built for the Superteam Earn bounty "Create an
open-source, real-time arbitrage monitoring tool for Raydium CPMM". Historical
submission notes are in `SUBMISSION.md`; they do not establish a bounty award.

## Safety

The project is read-only. It never asks for a wallet private key, never sends a transaction, and never performs financial writes.
