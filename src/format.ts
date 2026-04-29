import type { NormalizedPool, Opportunity, Snapshot } from "./types.js";

function short(value: string): string {
  return value.length <= 10 ? value : `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function num(value: number, decimals = 6): string {
  if (!Number.isFinite(value)) return "n/a";
  if (Math.abs(value) >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return value.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function poolRows(pools: NormalizedPool[]): string[] {
  const rows = ["Pools", "pool          labels                 price(base->quote) fee_bps tvl_usd"];
  for (const pool of pools.slice(0, 12)) {
    rows.push(`${short(pool.id).padEnd(13)} ${pool.labels.join(",").slice(0, 22).padEnd(22)} ${num(pool.priceBaseInQuote, 8).padStart(18)} ${num(pool.feeBps, 2).padStart(7)} ${num(pool.tvl, 2).padStart(10)}`);
  }
  if (pools.length > 12) rows.push(`... ${pools.length - 12} more pools omitted`);
  return rows;
}

function opportunityRows(opportunities: Opportunity[]): string[] {
  const rows = ["", "Opportunities", "net_bps gross_bps profit_quote buy_pool      sell_pool     buy_price sell_price"];
  if (opportunities.length === 0) {
    rows.push("No opportunities above the configured net-profit threshold.");
    return rows;
  }
  for (const op of opportunities.slice(0, 20)) {
    rows.push(`${num(op.netProfitBps, 2).padStart(7)} ${num(op.grossSpreadBps, 2).padStart(9)} ${num(op.estimatedNetProfitQuote, 8).padStart(12)} ${short(op.buyPoolId).padEnd(13)} ${short(op.sellPoolId).padEnd(13)} ${num(op.buyPrice, 8).padStart(9)} ${num(op.sellPrice, 8).padStart(10)}`);
  }
  if (opportunities.length > 20) rows.push(`... ${opportunities.length - 20} more opportunities omitted`);
  return rows;
}

export function renderSnapshot(snapshot: Snapshot): string {
  const base = snapshot.pools[0]?.baseSymbol ?? snapshot.mintA.slice(0, 4);
  const quote = snapshot.pools[0]?.quoteSymbol ?? snapshot.mintB.slice(0, 4);
  return [
    `Raydium CPMM/standard arbitrage monitor @ ${snapshot.generatedAt}`,
    `Pair: ${base}/${quote} (${short(snapshot.mintA)} -> ${short(snapshot.mintB)}), amountBase=${snapshot.amountBase}`,
    `Discovered pools: ${snapshot.pools.length}, opportunities: ${snapshot.opportunities.length}`,
    "",
    ...poolRows(snapshot.pools),
    ...opportunityRows(snapshot.opportunities),
  ].join("\n");
}

export function snapshotToJson(snapshot: Snapshot): string {
  return JSON.stringify(snapshot, null, 2);
}
