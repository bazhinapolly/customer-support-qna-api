import assert from "node:assert/strict";
import test from "node:test";
import OpenAI from "openai";
import { answerSupportQuestion } from "../src/openaiClient.js";
import { buildSystemPrompt, buildUserPrompt } from "../src/prompt.js";
import { mapOpenAIError, validateQuestionPayload } from "../src/validation.js";
import { preprocessQuestion } from "../src/preprocess.js";
import { createAuthFailureTracker } from "../src/rateLimiter.js";

test("validateQuestionPayload rejects invalid payloads and normalizes a question", () => {
  assert.equal(validateQuestionPayload(null).ok, false);
  assert.equal(validateQuestionPayload([]).ok, false);
  assert.equal(validateQuestionPayload({}).ok, false);
  assert.equal(validateQuestionPayload({ question: "   " }).ok, false);
  assert.equal(validateQuestionPayload({ question: "x".repeat(2001) }).ok, false);
  assert.deepEqual(validateQuestionPayload({ question: "  What are your hours?  " }), {
    ok: true,
    question: "What are your hours?"
  });
});

test("prompt builders delimit the fixed context and user question", () => {
  const systemPrompt = buildSystemPrompt("Hours: Monday to Friday.");
  assert.match(systemPrompt, /Support context:/);
  assert.match(systemPrompt, /Hours: Monday to Friday\./);
  assert.match(systemPrompt, /Do not invent prices/);

  const userPrompt = buildUserPrompt("  What are your hours?  ");
  assert.match(userPrompt, /What are your hours\?/);
});

test("answerSupportQuestion calls the Responses API and normalizes output", async () => {
  let capturedRequest;
  let capturedOptions;
  const client = {
    responses: {
      async create(request, options) {
        capturedRequest = request;
        capturedOptions = options;
        return {
          status: "completed",
          output: [],
          output_text: "  We are open Monday to Friday.  ",
          model: "test-model-2026-01-01",
          usage: { input_tokens: 10, output_tokens: 8, total_tokens: 18 }
        };
      }
    }
  };

  const result = await answerSupportQuestion({
    client,
    question: "When are you open?",
    model: "test-model",
    timeoutMs: 2500
  });

  assert.equal(capturedRequest.model, "test-model");
  assert.equal(capturedRequest.store, false);
  assert.match(capturedRequest.instructions, /Northstar Home Services/);
  assert.match(capturedRequest.input, /When are you open\?/);
  assert.deepEqual(capturedOptions, { timeout: 2500 });
  assert.deepEqual(result, {
    answer: "We are open Monday to Friday.",
    model: "test-model-2026-01-01",
    usage: { input_tokens: 10, output_tokens: 8, total_tokens: 18 }
  });
});

test("answerSupportQuestion rejects an empty provider response", async () => {
  const client = {
    responses: { async create() { return { status: "completed", output: [], output_text: "" }; } }
  };

  await assert.rejects(
    answerSupportQuestion({
      client,
      question: "Question",
      model: "test-model",
      timeoutMs: 2500
    }),
    /did not include completed answer text/
  );
});

test("answerSupportQuestion rejects incomplete responses even when text exists", async () => {
  const client = { responses: { async create() { return { status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output_text: "A partial answer" }; } } };
  await assert.rejects(answerSupportQuestion({ client, question: "Question", model: "test", timeoutMs: 1000 }), (error) => error.code === "incomplete_response");
});

test("answerSupportQuestion rejects provider refusals", async () => {
  const client = { responses: { async create() { return { status: "completed", output_text: "This must not be returned", output: [{ content: [{ type: "refusal", refusal: "Unable" }] }] }; } } };
  await assert.rejects(answerSupportQuestion({ client, question: "Question", model: "test", timeoutMs: 1000 }), (error) => error.code === "provider_refusal");
});

test("answerSupportQuestion rejects explicit provider errors and normalizes absent usage", async () => {
  const failed = { responses: { async create() { return { status: "completed", error: { code: "provider_error" }, output_text: "unsafe" }; } } };
  await assert.rejects(
    answerSupportQuestion({ client: failed, question: "Question", model: "test", timeoutMs: 1000 }),
    (error) => error.code === "provider_response_error"
  );

  const completed = { responses: { async create() { return { status: "completed", output: [], output_text: "Answer" }; } } };
  const result = await answerSupportQuestion({ client: completed, question: "Question", model: "test", timeoutMs: 1000 });
  assert.equal(result.usage, null);
  assert.equal(result.model, "test");
});

test("mapOpenAIError recognizes real OpenAI SDK error classes", () => {
  assert.equal(mapOpenAIError(new OpenAI.RateLimitError()).statusCode, 503);
  assert.equal(
    mapOpenAIError(new OpenAI.APIConnectionTimeoutError()).statusCode,
    504
  );
  assert.equal(mapOpenAIError(new OpenAI.APIUserAbortError()).statusCode, 504);
  assert.equal(mapOpenAIError(new Error("Unexpected")).statusCode, 502);
});

test("preprocessQuestion redacts contact data and long account-like numbers", () => {
  const result = preprocessQuestion("Email alex@example.com or call +1 (212) 555-0199. Reference 1234 5678 9012.");
  assert.equal(result.ok, true);
  assert.doesNotMatch(result.question, /alex@example\.com|555-0199|1234 5678 9012/);
  assert.match(result.question, /\[redacted/);
});

test("preprocessQuestion blocks sensitive categories and supports explicit redaction opt-out", () => {
  for (const question of ["My password is secret", "My credit card was charged", "Here is my medical diagnosis"]) {
    assert.equal(preprocessQuestion(question).ok, false);
  }
  assert.deepEqual(preprocessQuestion("Email alex@example.com", { redactPii: false }), {
    ok: true,
    question: "Email alex@example.com",
    redactions: []
  });
});

test("auth failure tracker uses an isolated fixed window", () => {
  let now = 1000;
  const tracker = createAuthFailureTracker({ windowMs: 1000, limit: 1, now: () => now });
  assert.deepEqual(tracker.record("127.0.0.1"), {
    allowed: true, limit: 1, remaining: 0, retryAfterSeconds: 1, windowSeconds: 1
  });
  assert.deepEqual(tracker.record("127.0.0.1"), {
    allowed: false, limit: 1, remaining: 0, retryAfterSeconds: 1, windowSeconds: 1
  });
  assert.equal(tracker.record("127.0.0.2").allowed, true);
  now = 2000;
  assert.equal(tracker.record("127.0.0.1").allowed, true);
});

test("auth failure tracker prunes expired buckets and stays memory bounded", () => {
  let now = 1000;
  const tracker = createAuthFailureTracker({ windowMs: 1000, limit: 2, maxBuckets: 2, now: () => now });
  tracker.record("one");
  tracker.record("two");
  assert.equal(tracker.size(), 2);
  tracker.record("three");
  assert.equal(tracker.size(), 2);
  now = 2500;
  tracker.record("four");
  assert.equal(tracker.size(), 1);
});
