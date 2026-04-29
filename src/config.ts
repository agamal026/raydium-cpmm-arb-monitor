import { existsSync, readFileSync } from "node:fs";
import type { LogLevel, MonitorConfig } from "./types.js";

const DEFAULT_SOL = "So11111111111111111111111111111111111111112";
const DEFAULT_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export function loadDotEnv(path = ".env", env: NodeJS.ProcessEnv = process.env): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && env[key] === undefined) env[key] = value;
  }
}

function getFlag(argv: string[], name: string): string | undefined {
  const long = `--${name}`;
  const prefixed = `${long}=`;
  const exact = argv.indexOf(long);
  if (exact >= 0) return argv[exact + 1];
  const withEquals = argv.find((arg) => arg.startsWith(prefixed));
  return withEquals?.slice(prefixed.length);
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}

function numberValue(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a finite number, got ${value}`);
  return parsed;
}

function intValue(value: string | undefined, fallback: number, name: string): number {
  const parsed = numberValue(value, fallback, name);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer, got ${value}`);
  return parsed;
}

function logLevel(value: string | undefined): LogLevel {
  const level = (value ?? "info") as LogLevel;
  if (!["debug", "info", "warn", "error"].includes(level)) {
    throw new Error(`log-level must be debug, info, warn, or error; got ${value}`);
  }
  return level;
}

export function readConfig(argv = process.argv.slice(2), env: NodeJS.ProcessEnv = process.env): MonitorConfig {
  loadDotEnv(".env", env);
  const mintA = getFlag(argv, "mint-a") ?? env.MINT_A ?? DEFAULT_SOL;
  const mintB = getFlag(argv, "mint-b") ?? env.MINT_B ?? DEFAULT_USDC;
  if (mintA === mintB) throw new Error("mint-a and mint-b must be different mint addresses");

  const config: MonitorConfig = {
    mintA,
    mintB,
    amountBase: numberValue(getFlag(argv, "amount") ?? env.AMOUNT_BASE, 1, "amount"),
    pollIntervalMs: intValue(getFlag(argv, "interval") ?? env.POLL_INTERVAL_MS, 10_000, "interval"),
    minProfitBps: numberValue(getFlag(argv, "min-profit-bps") ?? env.MIN_PROFIT_BPS, 5, "min-profit-bps"),
    txCostBps: numberValue(getFlag(argv, "tx-cost-bps") ?? env.TX_COST_BPS, 2, "tx-cost-bps"),
    minTvlUsd: numberValue(getFlag(argv, "min-tvl-usd") ?? env.MIN_TVL_USD, 1000, "min-tvl-usd"),
    once: hasFlag(argv, "once") || env.ONCE === "true",
    json: hasFlag(argv, "json") || env.JSON === "true",
    rpcUrl: (getFlag(argv, "rpc-url") ?? env.RPC_URL) || undefined,
    logLevel: logLevel(getFlag(argv, "log-level") ?? env.LOG_LEVEL),
    pageSize: intValue(getFlag(argv, "page-size") ?? env.PAGE_SIZE, 100, "page-size"),
    timeoutMs: intValue(getFlag(argv, "timeout-ms") ?? env.TIMEOUT_MS, 12_000, "timeout-ms"),
    retries: intValue(getFlag(argv, "retries") ?? env.RETRIES, 2, "retries"),
  };

  if (config.amountBase <= 0) throw new Error("amount must be > 0");
  if (config.minTvlUsd < 0) throw new Error("min-tvl-usd must be >= 0");
  if (config.pollIntervalMs < 1000) throw new Error("interval must be at least 1000 ms");
  if (config.pageSize < 1 || config.pageSize > 1000) throw new Error("page-size must be between 1 and 1000");
  if (config.timeoutMs < 1000) throw new Error("timeout-ms must be at least 1000 ms");
  if (config.retries < 0 || config.retries > 10) throw new Error("retries must be between 0 and 10");
  return config;
}

export function usage(): string {
  return `raydium-cpmm-arb [options]

Options:
  --mint-a <mint>          Base token mint (default: SOL)
  --mint-b <mint>          Quote token mint (default: USDC)
  --amount <number>        Base-token amount used for profit estimates (default: 1)
  --interval <ms>          Poll interval for live mode (default: 10000)
  --min-profit-bps <bps>   Minimum net profit threshold to show (default: 5)
  --tx-cost-bps <bps>      Estimated transaction/priority-fee cost in bps (default: 2)
  --min-tvl-usd <usd>      Ignore pools below this TVL to avoid dust-pool false positives (default: 1000)
  --rpc-url <url>          Optional read-only RPC getHealth check endpoint
  --page-size <number>     Raydium API page size (default: 100)
  --timeout-ms <ms>        Fetch timeout per request (default: 12000)
  --retries <number>       Raydium API retries (default: 2)
  --json                   Emit JSON snapshots instead of a table
  --once                   Run one poll and exit
  --log-level <level>      debug, info, warn, error (default: info)
  --help                   Print this help
`;
}
