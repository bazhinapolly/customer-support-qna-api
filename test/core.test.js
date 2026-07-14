import assert from "node:assert/strict";
import test from "node:test";
import OpenAI from "openai";
import { answerSupportQuestion } from "../src/openaiClient.js";
import { buildSystemPrompt, buildUserPrompt } from "../src/prompt.js";
import { mapOpenAIError, validateQuestionPayload } from "../src/validation.js";

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
    responses: { async create() { return { output_text: "" }; } }
  };

  await assert.rejects(
    answerSupportQuestion({
      client,
      question: "Question",
      model: "test-model",
      timeoutMs: 2500
    }),
    /did not include answer text/
  );
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
