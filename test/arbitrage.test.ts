import assert from "node:assert/strict";
import test from "node:test";
import { normalizePool, normalizePools, scoreOpportunities } from "../src/arbitrage.js";
import type { RaydiumPool } from "../src/types.js";

const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function pool(id: string, price: number, feeRate = 0.0025): RaydiumPool {
  return {
    id,
    type: "Standard",
    pooltype: ["Amm"],
    mintA: { address: SOL, symbol: "SOL", decimals: 9 },
    mintB: { address: USDC, symbol: "USDC", decimals: 6 },
    price,
    feeRate,
    tvl: 100_000,
    mintAmountA: 100,
    mintAmountB: 100 * price,
  };
}

test("normalizes Raydium price when requested mint order matches pool order", () => {
  const normalized = normalizePool(pool("p1", 84.5), SOL, USDC);
  assert.ok(normalized);
  assert.equal(normalized.priceBaseInQuote, 84.5);
  assert.equal(normalized.feeBps, 25);
  assert.equal(normalized.baseSymbol, "SOL");
});

test("inverts Raydium price when requested mint order is reversed", () => {
  const normalized = normalizePool(pool("p1", 84.5), USDC, SOL);
  assert.ok(normalized);
  assert.equal(Number(normalized.priceBaseInQuote.toFixed(8)), Number((1 / 84.5).toFixed(8)));
  assert.equal(normalized.baseSymbol, "USDC");
});

test("scores profitable cross-pool opportunities after fees and tx cost", () => {
  const pools = normalizePools([pool("cheap", 84), pool("rich", 86)], SOL, USDC);
  const opportunities = scoreOpportunities(pools, 1, 5, 2);
  assert.equal(opportunities.length, 1);
  assert.equal(opportunities[0].buyPoolId, "cheap");
  assert.equal(opportunities[0].sellPoolId, "rich");
  assert.ok(opportunities[0].grossSpreadBps > 200);
  assert.ok(opportunities[0].netProfitBps > 150);
  assert.ok(opportunities[0].estimatedNetProfitQuote > 1);
});

test("filters opportunities below net-profit threshold", () => {
  const pools = normalizePools([pool("a", 84), pool("b", 84.01)], SOL, USDC);
  const opportunities = scoreOpportunities(pools, 1, 5, 2);
  assert.equal(opportunities.length, 0);
});
