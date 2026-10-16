import type { MonitorConfig, RaydiumPool } from "./types.js";

interface RaydiumEnvelope {
  success?: boolean;
  data?: {
    count?: number;
    data?: RaydiumPool[];
  };
  msg?: string;
}

export function buildRaydiumPoolUrl(config: Pick<MonitorConfig, "mintA" | "mintB" | "pageSize">): URL {
  const url = new URL("https://api-v3.raydium.io/pools/info/mint");
  url.searchParams.set("mint1", config.mintA);
  url.searchParams.set("mint2", config.mintB);
  url.searchParams.set("poolType", "standard");
  url.searchParams.set("poolSortField", "liquidity");
  url.searchParams.set("sortType", "desc");
  url.searchParams.set("pageSize", String(config.pageSize));
  url.searchParams.set("page", "1");
  return url;
}

async function fetchTextWithTimeout(url: URL | string, timeoutMs: number, init?: RequestInit): Promise<{ response: Response; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    // fetch resolves when headers arrive. Keep the deadline active while the
    // body is being received too, including an endpoint that stops mid-body.
    return { response, text: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverPools(config: MonitorConfig): Promise<RaydiumPool[]> {
  const url = buildRaydiumPoolUrl(config);
  let lastError: unknown;
  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      const { response, text } = await fetchTextWithTimeout(url, config.timeoutMs, {
        headers: { accept: "application/json", "user-agent": "raydium-cpmm-arb-monitor/0.1" },
      });
      if (!response.ok) throw new Error(`Raydium API ${response.status}: ${text.slice(0, 300)}`);
      const envelope = JSON.parse(text) as RaydiumEnvelope;
      if (!envelope.success) throw new Error(`Raydium API returned success=false: ${envelope.msg ?? text.slice(0, 300)}`);
      return (envelope.data?.data ?? []).filter((pool) => pool.id && pool.mintA?.address && pool.mintB?.address);
    } catch (error) {
      lastError = error;
      if (attempt < config.retries) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function checkRpcHealth(rpcUrl: string | undefined, timeoutMs: number): Promise<{ ok: boolean; status: string }> {
  if (!rpcUrl) return { ok: true, status: "not_configured" };
  try {
    const { text } = await fetchTextWithTimeout(rpcUrl, Math.min(timeoutMs, 5_000), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "health", method: "getHealth" }),
    });
    const json = JSON.parse(text) as { result?: string; error?: { message?: string } };
    if (json.result === "ok") return { ok: true, status: "ok" };
    return { ok: false, status: json.error?.message ?? "non_ok_response" };
  } catch (error) {
    return { ok: false, status: error instanceof Error ? error.message : String(error) };
  }
}
