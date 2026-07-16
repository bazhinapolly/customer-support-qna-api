import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

const silentLogger = { error() {} };
const SUPPORT_SECRET = "a".repeat(64);

function buildApp(overrides = {}) {
  const config = loadConfig({
    OPENAI_API_KEY: "openai-secret",
    SUPPORT_API_KEY: SUPPORT_SECRET,
    RATE_LIMIT_MAX: "100",
    ...overrides.env
  });

  return createApp({
    config,
    logger: silentLogger,
    answerQuestion:
      overrides.answerQuestion ||
      (async () => ({
        answer: "Opening hours are in the provided context.",
        model: "test-model",
        usage: null
      }))
  });
}

async function requestApp(app, path, options = {}) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, options);
    return {
      status: response.status,
      headers: response.headers,
      body: await response.json()
    };
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function jsonRequest(body, token = SUPPORT_SECRET) {
  return {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: typeof body === "string" ? body : JSON.stringify(body)
  };
}

test("health endpoints separate liveness from readiness", async () => {
  const live = await requestApp(buildApp(), "/health/live");
  assert.equal(live.status, 200);
  assert.deepEqual(live.body, { status: "ok" });

  const ready = await requestApp(buildApp(), "/health/ready");
  assert.equal(ready.status, 200);
  assert.deepEqual(ready.body, { status: "ready" });

  const notReady = await requestApp(
    buildApp({ env: { OPENAI_API_KEY: "", SUPPORT_API_KEY: "" } }),
    "/health/ready"
  );
  assert.equal(notReady.status, 503);
  assert.deepEqual(notReady.body.missing, ["OPENAI_API_KEY", "SUPPORT_API_KEY"]);
});

test("support endpoint requires a valid bearer token", async () => {
  const missing = await requestApp(buildApp(), "/support/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "What are your hours?" })
  });
  assert.equal(missing.status, 401);
  assert.deepEqual(missing.body, {
    error: "unauthorized",
    message: "A valid bearer token is required."
  });

  const invalid = await requestApp(
    buildApp(),
    "/support/ask",
    jsonRequest({ question: "What are your hours?" }, "wrong-secret")
  );
  assert.equal(invalid.status, 401);
});

test("support endpoint validates input and returns the provider result", async () => {
  const invalid = await requestApp(
    buildApp(),
    "/support/ask",
    jsonRequest({ question: "   " })
  );
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body, {
    error: "invalid_request",
    message: "Question cannot be empty."
  });

  const valid = await requestApp(
    buildApp(),
    "/support/ask",
    jsonRequest({ question: "What are your hours?" })
  );
  assert.equal(valid.status, 200);
  assert.deepEqual(valid.body, {
    answer: "Opening hours are in the provided context.",
    model: "test-model",
    usage: null
  });
});

test("malformed JSON and oversized bodies produce JSON errors", async () => {
  const malformed = await requestApp(
    buildApp(),
    "/support/ask",
    jsonRequest('{"question":')
  );
  assert.equal(malformed.status, 400);
  assert.deepEqual(malformed.body, {
    error: "invalid_json",
    message: "Request body must contain valid JSON."
  });

  const oversized = await requestApp(
    buildApp(),
    "/support/ask",
    jsonRequest({ question: "x".repeat(33 * 1024) })
  );
  assert.equal(oversized.status, 413);
  assert.deepEqual(oversized.body, {
    error: "payload_too_large",
    message: "Request body exceeds the 32 KB limit."
  });
});

test("provider failures use stable public error responses", async () => {
  const TimeoutError = class APIConnectionTimeoutError extends Error {};
  const app = buildApp({
    answerQuestion: async () => {
      throw new TimeoutError("internal provider details");
    }
  });

  const response = await requestApp(
    app,
    "/support/ask",
    jsonRequest({ question: "What are your hours?" })
  );
  assert.equal(response.status, 504);
  assert.deepEqual(response.body, {
    error: "provider_timeout",
    message: "The answer service took too long to respond."
  });
});

test("rate limiter protects the paid endpoint", async () => {
  const app = buildApp({ env: { RATE_LIMIT_MAX: "1" } });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/support/ask`;

  try {
    const first = await fetch(url, jsonRequest({ question: "First question" }));
    assert.equal(first.status, 200);

    const second = await fetch(url, jsonRequest({ question: "Second question" }));
    assert.equal(second.status, 429);
    assert.deepEqual(await second.json(), {
      error: "rate_limited",
      message: "Too many requests. Please try again later."
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("unknown routes return JSON 404", async () => {
  const response = await requestApp(buildApp(), "/missing");
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    error: "not_found",
    message: "Endpoint not found."
  });
});
