import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { readFile } from "node:fs/promises";

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

test("failed authentication has its own limiter and missing configuration stays unavailable", async () => {
  const app = buildApp({ env: { AUTH_FAILURE_RATE_LIMIT_MAX: "1" } });
  const first = await requestApp(app, "/support/ask", jsonRequest({ question: "Question" }, "wrong-one"));
  const second = await requestApp(app, "/support/ask", jsonRequest({ question: "Question" }, "wrong-two"));
  assert.equal(first.status, 401);
  assert.equal(second.status, 429);
  assert.equal(second.body.error, "auth_rate_limited");

  const missingBoth = await requestApp(
    buildApp({ env: { OPENAI_API_KEY: "", SUPPORT_API_KEY: "" } }),
    "/support/ask",
    jsonRequest({ question: "Question" })
  );
  assert.equal(missingBoth.status, 503);

  const missingProvider = await requestApp(
    buildApp({ env: { OPENAI_API_KEY: "" } }),
    "/support/ask",
    jsonRequest({ question: "Question" })
  );
  assert.equal(missingProvider.status, 503);
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

test("authentication runs before JSON parsing", async () => {
  const app = buildApp();
  const malformed = await requestApp(app, "/support/ask", {
    method: "POST",
    headers: { authorization: "Bearer wrong", "content-type": "application/json" },
    body: '{"question":'
  });
  assert.equal(malformed.status, 401);
  assert.equal(malformed.body.error, "unauthorized");

  const oversized = await requestApp(app, "/support/ask", {
    method: "POST",
    headers: { authorization: "Bearer wrong", "content-type": "application/json" },
    body: JSON.stringify({ question: "x".repeat(33 * 1024) })
  });
  assert.equal(oversized.status, 401);
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
    const invalid = await fetch(url, jsonRequest({ question: "Invalid token" }, "wrong-secret"));
    assert.equal(invalid.status, 401);

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

test("PII is redacted before the provider and sensitive categories never call it", async () => {
  const received = [];
  const app = buildApp({ answerQuestion: async (question) => {
    received.push(question);
    return { answer: "ok", model: "test", usage: null };
  }});
  const redacted = await requestApp(app, "/support/ask", jsonRequest({
    question: "Please reply to alex@example.com or +1 (212) 555-0199."
  }));
  assert.equal(redacted.status, 200);
  assert.equal(received.length, 1);
  assert.doesNotMatch(received[0], /alex@example\.com|555-0199/);

  const denied = await requestApp(app, "/support/ask", jsonRequest({
    question: "My credit card number needs support."
  }));
  assert.equal(denied.status, 400);
  assert.equal(denied.body.error, "sensitive_content");
  assert.equal(received.length, 1);
});

test("readiness responses conform to their OpenAPI schemas", async () => {
  const contract = JSON.parse(await readFile(new URL("../openapi.yaml", import.meta.url), "utf8"));
  const responses = contract.paths["/health/ready"].get.responses;
  const ready = await requestApp(buildApp(), "/health/ready");
  const notReady = await requestApp(buildApp({ env: { OPENAI_API_KEY: "", SUPPORT_API_KEY: "" } }), "/health/ready");
  validateObjectSchema(ready.body, resolveSchema(responses[String(ready.status)], contract));
  validateObjectSchema(notReady.body, resolveSchema(responses[String(notReady.status)], contract));
});

function resolveSchema(response, contract) {
  const schema = response.content["application/json"].schema;
  return schema.$ref
    ? schema.$ref.split("/").slice(1).reduce((value, part) => value[part], contract)
    : schema;
}

function validateObjectSchema(value, schema) {
  assert.equal(typeof value, "object");
  for (const key of schema.required || []) assert.ok(Object.hasOwn(value, key), `missing ${key}`);
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) assert.ok(Object.hasOwn(schema.properties, key), `unexpected ${key}`);
  }
  for (const [key, property] of Object.entries(schema.properties || {})) {
    if (!Object.hasOwn(value, key)) continue;
    if (property.type === "string") assert.equal(typeof value[key], "string");
    if (property.type === "array") assert.ok(Array.isArray(value[key]));
    if (property.enum) assert.ok(property.enum.includes(value[key]));
    if (property.items?.enum) for (const item of value[key]) assert.ok(property.items.enum.includes(item));
  }
}

test("unknown routes return JSON 404", async () => {
  const response = await requestApp(buildApp(), "/missing");
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    error: "not_found",
    message: "Endpoint not found."
  });
});
