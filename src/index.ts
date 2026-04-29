#!/usr/bin/env node
import { normalizePools, scoreOpportunities } from "./arbitrage.js";
import { readConfig, usage } from "./config.js";
import { renderSnapshot, snapshotToJson } from "./format.js";
import { Logger } from "./logger.js";
import { checkRpcHealth, discoverPools } from "./raydium.js";
import type { MonitorConfig, Snapshot } from "./types.js";

async function collectSnapshot(config: MonitorConfig, logger: Logger): Promise<Snapshot> {
  logger.debug("discovering_pools", { mintA: config.mintA, mintB: config.mintB, pageSize: config.pageSize });
  const rawPools = await discoverPools(config);
  const pools = normalizePools(rawPools, config.mintA, config.mintB).filter((pool) => pool.tvl >= config.minTvlUsd);
  const opportunities = scoreOpportunities(pools, config.amountBase, config.minProfitBps, config.txCostBps);
  logger.info("snapshot_collected", { pools: pools.length, opportunities: opportunities.length, minProfitBps: config.minProfitBps });
  return {
    generatedAt: new Date().toISOString(),
    mintA: config.mintA,
    mintB: config.mintB,
    amountBase: config.amountBase,
    pools,
    opportunities,
  };
}

async function run(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const config = readConfig();
  const logger = new Logger(config.logLevel, config.json);

  const rpc = await checkRpcHealth(config.rpcUrl, config.timeoutMs);
  if (config.rpcUrl) {
    const redacted = config.rpcUrl.replace(/([?&](api[_-]?key|key|token)=)[^&]+/gi, "$1[REDACTED]");
    logger[rpc.ok ? "info" : "warn"]("rpc_health", { ok: rpc.ok, status: rpc.status, rpcUrl: redacted });
  }

  const poll = async () => {
    const snapshot = await collectSnapshot(config, logger);
    if (!config.json && !config.once && process.stdout.isTTY) process.stdout.write("\x1Bc");
    console.log(config.json ? snapshotToJson(snapshot) : renderSnapshot(snapshot));
  };

  await poll();
  if (config.once) return;
  setInterval(() => {
    poll().catch((error) => logger.error("poll_failed", { error: error instanceof Error ? error.message : String(error) }));
  }, config.pollIntervalMs);
}

run().catch((error) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", message: "fatal", error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
