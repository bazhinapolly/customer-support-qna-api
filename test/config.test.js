import assert from "node:assert/strict";
import test from "node:test";
import { getMissingSecrets, loadConfig } from "../src/config.js";

const SUPPORT_SECRET = "a".repeat(64);

test("loadConfig applies documented defaults", () => {
  const config = loadConfig({
    OPENAI_API_KEY: "openai-secret",
    SUPPORT_API_KEY: SUPPORT_SECRET
  });

  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 3000);
  assert.equal(config.timeoutMs, 12000);
  assert.equal(config.model, "gpt-4o-mini-2024-07-18");
  assert.equal(config.redactPii, true);
  assert.equal(config.authFailureMaxBuckets, 10000);
  assert.equal(config.trustProxyHops, 0);
  assert.deepEqual(getMissingSecrets(config), []);
});

test("loadConfig rejects weak or reused inbound credentials", () => {
  assert.throws(() => loadConfig({ OPENAI_API_KEY: "openai-secret", SUPPORT_API_KEY: "short" }), /32-byte secret/);
  assert.throws(() => loadConfig({ OPENAI_API_KEY: SUPPORT_SECRET, SUPPORT_API_KEY: SUPPORT_SECRET }), /independent/);
  assert.doesNotThrow(() => loadConfig({ OPENAI_API_KEY: "openai-secret", SUPPORT_API_KEY: "A".repeat(43) }));
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
  assert.throws(() => loadConfig({ REDACT_PII: "maybe" }), /REDACT_PII/);
  assert.throws(() => loadConfig({ AUTH_FAILURE_MAX_BUCKETS: "10" }), /AUTH_FAILURE_MAX_BUCKETS/);
});

test("getMissingSecrets reports readiness requirements", () => {
  const config = loadConfig({});
  assert.deepEqual(getMissingSecrets(config), [
    "OPENAI_API_KEY",
    "SUPPORT_API_KEY"
  ]);
});
