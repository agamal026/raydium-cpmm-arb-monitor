export type LogLevel = "debug" | "info" | "warn" | "error";

export interface TokenInfo {
  address: string;
  symbol?: string;
  name?: string;
  decimals?: number;
}

export interface RaydiumPool {
  type?: string;
  programId?: string;
  id: string;
  mintA: TokenInfo;
  mintB: TokenInfo;
  price?: number;
  mintAmountA?: number;
  mintAmountB?: number;
  feeRate?: number;
  tvl?: number;
  pooltype?: string[];
  day?: {
    volume?: number;
    volumeQuote?: number;
    volumeFee?: number;
    apr?: number;
  };
}

export interface NormalizedPool {
  id: string;
  type: string;
  labels: string[];
  programId?: string;
  baseMint: string;
  quoteMint: string;
  baseSymbol: string;
  quoteSymbol: string;
  priceBaseInQuote: number;
  priceQuoteInBase: number;
  feeRate: number;
  feeBps: number;
  tvl: number;
  reserveBase: number;
  reserveQuote: number;
  sourcePrice: number;
}

export interface Opportunity {
  buyPoolId: string;
  sellPoolId: string;
  baseSymbol: string;
  quoteSymbol: string;
  buyPrice: number;
  sellPrice: number;
  grossSpreadBps: number;
  totalFeeBps: number;
  txCostBps: number;
  netProfitBps: number;
  amountBase: number;
  estimatedGrossProfitQuote: number;
  estimatedFeesQuote: number;
  estimatedTxCostQuote: number;
  estimatedNetProfitQuote: number;
  buyPoolTvl: number;
  sellPoolTvl: number;
}

export interface MonitorConfig {
  mintA: string;
  mintB: string;
  amountBase: number;
  pollIntervalMs: number;
  minProfitBps: number;
  txCostBps: number;
  minTvlUsd: number;
  once: boolean;
  json: boolean;
  rpcUrl?: string;
  logLevel: LogLevel;
  pageSize: number;
  timeoutMs: number;
  retries: number;
}

export interface Snapshot {
  generatedAt: string;
  mintA: string;
  mintB: string;
  amountBase: number;
  pools: NormalizedPool[];
  opportunities: Opportunity[];
}
