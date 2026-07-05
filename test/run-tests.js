import assert from "node:assert/strict";
import { buildSystemPrompt, buildUserPrompt } from "../src/prompt.js";
import { mapOpenAIError, validateQuestionPayload } from "../src/validation.js";

function testPayloadValidation() {
  assert.deepEqual(validateQuestionPayload(null), {
    ok: false,
    message: "Request body must be a JSON object."
  });

  assert.deepEqual(validateQuestionPayload({}), {
    ok: false,
    message: "Field 'question' is required and must be a string."
  });

  assert.deepEqual(validateQuestionPayload({ question: "   " }), {
    ok: false,
    message: "Question cannot be empty."
  });

  assert.deepEqual(validateQuestionPayload({ question: "Can I book a cleaning?" }), {
    ok: true,
    question: "Can I book a cleaning?"
  });
}

function testPromptBuilder() {
  const systemPrompt = buildSystemPrompt("Hours: Monday to Friday.");
  assert.equal(systemPrompt.includes("Support context:"), true);
  assert.equal(systemPrompt.includes("Hours: Monday to Friday."), true);
  assert.equal(systemPrompt.includes("Do not invent prices"), true);

  const userPrompt = buildUserPrompt("  What are your hours?  ");
  assert.equal(userPrompt.includes("What are your hours?"), true);
}

function testErrorMapping() {
  assert.equal(mapOpenAIError({ status: 429 }).statusCode, 429);
  assert.equal(mapOpenAIError({ name: "AbortError" }).statusCode, 504);
  assert.equal(mapOpenAIError(new Error("Unexpected")).statusCode, 502);
}

testPayloadValidation();
testPromptBuilder();
testErrorMapping();

console.log("All tests passed.");
