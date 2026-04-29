import assert from "node:assert/strict";
import test from "node:test";
import { readConfig } from "../src/config.js";

test("reads CLI flags over environment defaults", () => {
  const env = {
    MINT_A: "envA",
    MINT_B: "envB",
    AMOUNT_BASE: "2",
    POLL_INTERVAL_MS: "5000",
  } as NodeJS.ProcessEnv;
  const cfg = readConfig(["--mint-a", "cliA", "--mint-b=cliB", "--amount", "3", "--once", "--json"], env);
  assert.equal(cfg.mintA, "cliA");
  assert.equal(cfg.mintB, "cliB");
  assert.equal(cfg.amountBase, 3);
  assert.equal(cfg.once, true);
  assert.equal(cfg.json, true);
});
