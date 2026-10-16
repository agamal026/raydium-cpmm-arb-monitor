import assert from "node:assert/strict";
import { createServer, type RequestListener } from "node:http";
import test, { type TestContext } from "node:test";
import { checkRpcHealth, discoverPools } from "../src/raydium.js";
import type { MonitorConfig } from "../src/types.js";

const config: MonitorConfig = {
  mintA: "So11111111111111111111111111111111111111112",
  mintB: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  amountBase: 1,
  pollIntervalMs: 10_000,
  minProfitBps: 5,
  txCostBps: 2,
  minTvlUsd: 1000,
  once: true,
  json: false,
  logLevel: "error",
  pageSize: 100,
  timeoutMs: 2000,
  retries: 0,
};

const pools = [{ id: "pool", mintA: { address: config.mintA }, mintB: { address: config.mintB } }];
const poolBody = JSON.stringify({ success: true, data: { data: pools } });
const healthBody = JSON.stringify({ jsonrpc: "2.0", id: "health", result: "ok" });

async function localServer(t: TestContext, handler: RequestListener): Promise<string> {
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

// Discovery keeps its fixed production endpoint. Redirect only that exact
// endpoint in tests so the real HTTP client and abort behavior run offline.
function routeDiscovery(t: TestContext, origin: string, onHeaders = () => {}): void {
  const realFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    assert.equal(url.origin, "https://api-v3.raydium.io");
    assert.equal(url.pathname, "/pools/info/mint");
    const response = await realFetch(new URL(url.pathname + url.search, origin), init);
    onHeaders();
    return response;
  });
}

function delayedBody(t: TestContext, body: string): RequestListener {
  return (_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.write(body.slice(0, 1));
    // Finish eventually even on the broken implementation, giving a normal
    // success result that the regression rejects instead of a hanging test.
    const timer = setTimeout(() => response.end(body.slice(1)), 1000);
    response.once("close", () => clearTimeout(timer));
    t.after(() => clearTimeout(timer));
  };
}

test("discovers pools from a complete response", async (t) => {
  const origin = await localServer(t, (request, response) => {
    const url = new URL(request.url!, "http://localhost");
    assert.equal(url.searchParams.get("mint1"), config.mintA);
    assert.equal(url.searchParams.get("mint2"), config.mintB);
    response.end(poolBody);
  });
  routeDiscovery(t, origin);
  assert.deepEqual(await discoverPools(config), pools);
});

test("discovery timeout also covers a response body stalled after headers", async (t) => {
  const origin = await localServer(t, delayedBody(t, poolBody));
  let receivedHeaders = false;
  routeDiscovery(t, origin, () => { receivedHeaders = true; });
  await assert.rejects(discoverPools({ ...config, timeoutMs: 200 }), { name: "AbortError" });
  assert.equal(receivedHeaders, true, "the deadline must remain active after fetch returns headers");
});

test("discovery still times out while waiting for headers", async (t) => {
  const origin = await localServer(t, (_request, response) => {
    const timer = setTimeout(() => response.end(poolBody), 1000);
    response.once("close", () => clearTimeout(timer));
    t.after(() => clearTimeout(timer));
  });
  routeDiscovery(t, origin);
  await assert.rejects(discoverPools({ ...config, timeoutMs: 200 }), { name: "AbortError" });
});

test("discovery retains HTTP status and body in errors", async (t) => {
  const origin = await localServer(t, (_request, response) => {
    response.writeHead(503);
    response.end("temporarily unavailable");
  });
  routeDiscovery(t, origin);
  await assert.rejects(discoverPools(config), /Raydium API 503: temporarily unavailable/);
});

test("RPC health timeout also covers a response body stalled after headers", async (t) => {
  const origin = await localServer(t, delayedBody(t, healthBody));
  const result = await checkRpcHealth(origin, 200);
  assert.equal(result.ok, false);
});

test("RPC health retains complete success and provider error responses", async (t) => {
  const origin = await localServer(t, (request, response) => {
    assert.equal(request.method, "POST");
    response.setHeader("content-type", "application/json");
    response.end(request.url === "/ok" ? healthBody : JSON.stringify({ error: { message: "behind" } }));
  });
  assert.deepEqual(await checkRpcHealth(`${origin}/ok`, config.timeoutMs), { ok: true, status: "ok" });
  assert.deepEqual(await checkRpcHealth(`${origin}/error`, config.timeoutMs), { ok: false, status: "behind" });
  assert.deepEqual(await checkRpcHealth(undefined, config.timeoutMs), { ok: true, status: "not_configured" });
});
