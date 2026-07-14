import assert from "node:assert/strict";
import test from "node:test";
import { getMissingSecrets, loadConfig } from "../src/config.js";

test("loadConfig applies documented defaults", () => {
  const config = loadConfig({
    OPENAI_API_KEY: "openai-secret",
    SUPPORT_API_KEY: "support-secret"
  });

  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 3000);
  assert.equal(config.timeoutMs, 12000);
  assert.equal(config.trustProxyHops, 0);
  assert.deepEqual(getMissingSecrets(config), []);
});

test("loadConfig rejects invalid numeric configuration", () => {
  assert.throws(
    () => loadConfig({ PORT: "not-a-number" }),
    /PORT must be an integer/
  );
  assert.throws(
    () => loadConfig({ REQUEST_TIMEOUT_MS: "0" }),
    /REQUEST_TIMEOUT_MS must be an integer/
  );
});

test("getMissingSecrets reports readiness requirements", () => {
  const config = loadConfig({});
  assert.deepEqual(getMissingSecrets(config), [
    "OPENAI_API_KEY",
    "SUPPORT_API_KEY"
  ]);
});
