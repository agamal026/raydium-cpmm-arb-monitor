import type { NormalizedPool, Opportunity, RaydiumPool } from "./types.js";

const EPSILON = 1e-12;

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function normalizePool(pool: RaydiumPool, baseMint: string, quoteMint: string): NormalizedPool | null {
  const a = pool.mintA?.address;
  const b = pool.mintB?.address;
  const baseIsA = a === baseMint && b === quoteMint;
  const baseIsB = b === baseMint && a === quoteMint;
  if (!baseIsA && !baseIsB) return null;

  const reserveBase = baseIsA ? pool.mintAmountA : pool.mintAmountB;
  const reserveQuote = baseIsA ? pool.mintAmountB : pool.mintAmountA;
  const reservePrice = finitePositive(reserveBase) && finitePositive(reserveQuote) ? reserveQuote / reserveBase : undefined;

  let priceBaseInQuote: number | undefined;
  if (finitePositive(pool.price)) priceBaseInQuote = baseIsA ? pool.price : 1 / pool.price;
  if (!finitePositive(priceBaseInQuote)) priceBaseInQuote = reservePrice;
  if (!finitePositive(priceBaseInQuote)) return null;

  const base = baseIsA ? pool.mintA : pool.mintB;
  const quote = baseIsA ? pool.mintB : pool.mintA;
  const feeRate = finitePositive(pool.feeRate) ? pool.feeRate : 0;
  const labels = [pool.type, ...(pool.pooltype ?? [])].filter((x): x is string => Boolean(x));

  return {
    id: pool.id,
    type: pool.type ?? "Standard",
    labels,
    programId: pool.programId,
    baseMint,
    quoteMint,
    baseSymbol: base.symbol ?? baseMint.slice(0, 4),
    quoteSymbol: quote.symbol ?? quoteMint.slice(0, 4),
    priceBaseInQuote,
    priceQuoteInBase: 1 / priceBaseInQuote,
    feeRate,
    feeBps: feeRate * 10_000,
    tvl: finitePositive(pool.tvl) ? pool.tvl : 0,
    reserveBase: finitePositive(reserveBase) ? reserveBase : 0,
    reserveQuote: finitePositive(reserveQuote) ? reserveQuote : 0,
    sourcePrice: finitePositive(pool.price) ? pool.price : priceBaseInQuote,
  };
}

export function normalizePools(pools: RaydiumPool[], baseMint: string, quoteMint: string): NormalizedPool[] {
  const seen = new Set<string>();
  const normalized: NormalizedPool[] = [];
  for (const pool of pools) {
    const item = normalizePool(pool, baseMint, quoteMint);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    normalized.push(item);
  }
  return normalized.sort((left, right) => right.tvl - left.tvl);
}

export function scoreOpportunities(
  pools: NormalizedPool[],
  amountBase: number,
  minProfitBps: number,
  txCostBps: number,
): Opportunity[] {
  const opportunities: Opportunity[] = [];
  for (const buy of pools) {
    for (const sell of pools) {
      if (buy.id === sell.id) continue;
      if (sell.priceBaseInQuote <= buy.priceBaseInQuote + EPSILON) continue;

      const grossSpreadBps = ((sell.priceBaseInQuote - buy.priceBaseInQuote) / buy.priceBaseInQuote) * 10_000;
      const totalFeeBps = buy.feeBps + sell.feeBps;
      const netProfitBps = grossSpreadBps - totalFeeBps - txCostBps;
      if (netProfitBps < minProfitBps) continue;

      const grossProfitQuote = amountBase * (sell.priceBaseInQuote - buy.priceBaseInQuote);
      const feesQuote = amountBase * buy.priceBaseInQuote * buy.feeRate + amountBase * sell.priceBaseInQuote * sell.feeRate;
      const txCostQuote = amountBase * buy.priceBaseInQuote * (txCostBps / 10_000);
      const netProfitQuote = grossProfitQuote - feesQuote - txCostQuote;

      opportunities.push({
        buyPoolId: buy.id,
        sellPoolId: sell.id,
        baseSymbol: buy.baseSymbol,
        quoteSymbol: buy.quoteSymbol,
        buyPrice: buy.priceBaseInQuote,
        sellPrice: sell.priceBaseInQuote,
        grossSpreadBps,
        totalFeeBps,
        txCostBps,
        netProfitBps,
        amountBase,
        estimatedGrossProfitQuote: grossProfitQuote,
        estimatedFeesQuote: feesQuote,
        estimatedTxCostQuote: txCostQuote,
        estimatedNetProfitQuote: netProfitQuote,
        buyPoolTvl: buy.tvl,
        sellPoolTvl: sell.tvl,
      });
    }
  }
  return opportunities.sort((left, right) => right.netProfitBps - left.netProfitBps);
}
